import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode, Dispatch, SetStateAction } from 'react';
import {
  DashboardSettings,
  TimezoneConfig,
  FeedVisibility,
  ShortcutConfig,
  PanelId,
  PanelPosition,
  PanelPositions,
  PanelSizes,
  ViewportLayouts,
} from '../types';
import {
  DEFAULT_PANEL_SIZES,
  SETTINGS_KEY,
  loadSettings,
  saveSettings,
  resetPanelLayout as resetPanelLayoutStorage,
  replaceSettings as replaceSettingsStorage,
} from './settings';

const VIEWPORT_MATCH_TOLERANCE = 0.1;
const RESIZE_APPLY_DEBOUNCE_MS = 150;
const MAX_VIEWPORT_LAYOUTS = 50;

interface ViewportSnapshot {
  width: number;
  height: number;
  devicePixelRatio: number;
  screenWidth: number;
  screenHeight: number;
  visualScale: number;
}

function getViewportKey(viewport: ViewportSnapshot): string {
  return `${Math.round(viewport.width)}x${Math.round(viewport.height)}@${viewport.devicePixelRatio.toFixed(2)}#${Math.round(viewport.screenWidth)}x${Math.round(viewport.screenHeight)}`;
}

function getCurrentViewport(): ViewportSnapshot {
  const fallback: ViewportSnapshot = {
    width: 0,
    height: 0,
    devicePixelRatio: 1,
    screenWidth: 0,
    screenHeight: 0,
    visualScale: 1,
  };

  if (typeof window === 'undefined') {
    return fallback;
  }

  const visualViewport = window.visualViewport;
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio || 1,
    screenWidth: window.screen?.width || window.innerWidth,
    screenHeight: window.screen?.height || window.innerHeight,
    visualScale: visualViewport?.scale || 1,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampLayoutToViewport(
  panelPositions: PanelPositions,
  panelSizes: PanelSizes,
  viewport: ViewportSnapshot,
): { panelPositions: PanelPositions; panelSizes: PanelSizes } {
  const nextPositions: PanelPositions = { ...panelPositions };
  const nextSizes: PanelSizes = { ...panelSizes };

  if (!viewport.width || !viewport.height) {
    return { panelPositions: nextPositions, panelSizes: nextSizes };
  }

  for (const panelId of Object.keys(DEFAULT_PANEL_SIZES) as PanelId[]) {
    const fallbackSize = DEFAULT_PANEL_SIZES[panelId] || { width: 320, height: 240 };
    const rawSize = nextSizes[panelId] || fallbackSize;
    const width = clamp(rawSize.width, fallbackSize.width, Math.max(fallbackSize.width, viewport.width));
    const height = clamp(rawSize.height, fallbackSize.height, Math.max(fallbackSize.height, viewport.height));

    const maxX = Math.max(0, viewport.width - width);
    const maxY = Math.max(0, viewport.height - height);

    const rawPosition = nextPositions[panelId] || { x: 0, y: 0 };
    nextPositions[panelId] = {
      x: clamp(rawPosition.x, 0, maxX),
      y: clamp(rawPosition.y, 0, maxY),
    };
    nextSizes[panelId] = { width, height };
  }

  return { panelPositions: nextPositions, panelSizes: nextSizes };
}

function areLayoutsEqual(
  leftPositions: PanelPositions,
  leftSizes: PanelSizes,
  rightPositions: PanelPositions,
  rightSizes: PanelSizes,
): boolean {
  return JSON.stringify(leftPositions) === JSON.stringify(rightPositions)
    && JSON.stringify(leftSizes) === JSON.stringify(rightSizes);
}

function pruneViewportLayouts(viewportLayouts: ViewportLayouts): ViewportLayouts {
  const entries = Object.entries(viewportLayouts);
  if (entries.length <= MAX_VIEWPORT_LAYOUTS) {
    return viewportLayouts;
  }

  const sorted = entries.sort(([, left], [, right]) => {
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });

  return Object.fromEntries(sorted.slice(0, MAX_VIEWPORT_LAYOUTS));
}

function findBestMatchingViewportLayout(
  viewportLayouts: ViewportLayouts,
  viewport: ViewportSnapshot,
) {
  const entries = Object.entries(viewportLayouts);
  if (entries.length === 0) return null;

  let bestMatch: { key: string; score: number; layout: ViewportLayouts[string] } | null = null;

  for (const [key, layout] of entries) {
    if (!layout.viewportWidth || !layout.viewportHeight) continue;

    const widthDiff = Math.abs(layout.viewportWidth - viewport.width) / layout.viewportWidth;
    const heightDiff = Math.abs(layout.viewportHeight - viewport.height) / layout.viewportHeight;

    if (widthDiff > VIEWPORT_MATCH_TOLERANCE || heightDiff > VIEWPORT_MATCH_TOLERANCE) {
      continue;
    }

    const layoutDpr = layout.devicePixelRatio || 1;
    const dprDiff = Math.abs(layoutDpr - viewport.devicePixelRatio) / Math.max(layoutDpr, viewport.devicePixelRatio, 0.01);

    const layoutScreenWidth = layout.screenWidth || layout.viewportWidth;
    const layoutScreenHeight = layout.screenHeight || layout.viewportHeight;
    const screenWidthDiff = Math.abs(layoutScreenWidth - viewport.screenWidth) / Math.max(layoutScreenWidth, viewport.screenWidth, 1);
    const screenHeightDiff = Math.abs(layoutScreenHeight - viewport.screenHeight) / Math.max(layoutScreenHeight, viewport.screenHeight, 1);

    const score = Math.sqrt(
      widthDiff * widthDiff
      + heightDiff * heightDiff
      + dprDiff * dprDiff
      + screenWidthDiff * screenWidthDiff
      + screenHeightDiff * screenHeightDiff,
    );

    if (!bestMatch || score < bestMatch.score) {
      bestMatch = { key, score, layout };
    }
  }

  return bestMatch;
}

function buildViewportLayouts(
  current: DashboardSettings,
  panelPositions: PanelPositions,
  panelSizes: PanelSizes,
): ViewportLayouts {
  const viewport = getCurrentViewport();
  if (!viewport.width || !viewport.height) {
    return current.viewportLayouts || {};
  }

  const key = getViewportKey(viewport);
  const viewportLayouts = current.viewportLayouts || {};

  const existing = viewportLayouts[key];
  if (
    existing
    && areLayoutsEqual(existing.panelPositions, existing.panelSizes, panelPositions, panelSizes)
  ) {
    return viewportLayouts;
  }

  const nextLayouts = {
    ...viewportLayouts,
    [key]: {
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      devicePixelRatio: viewport.devicePixelRatio,
      screenWidth: viewport.screenWidth,
      screenHeight: viewport.screenHeight,
      visualScale: viewport.visualScale,
      panelPositions,
      panelSizes,
      updatedAt: new Date().toISOString(),
    },
  };

  return pruneViewportLayouts(nextLayouts);
}

function withSettingsVersion(settings: DashboardSettings): DashboardSettings {
  return {
    ...settings,
    settingsVersion: settings.settingsVersion || 2,
  };
}

function resolveAppliedKeyForViewport(
  viewportLayouts: ViewportLayouts,
  viewport: ViewportSnapshot,
): string | null {
  const match = findBestMatchingViewportLayout(viewportLayouts, viewport);
  return match?.key || null;
}

function persistSettings(
  updateFn: (current: DashboardSettings) => DashboardSettings,
  setSettings: Dispatch<SetStateAction<DashboardSettings>>,
): DashboardSettings | null {
  let latest: DashboardSettings | null = null;

  setSettings((prev) => {
    const next = withSettingsVersion(updateFn(prev));
    saveSettings(next);
    latest = next;
    return next;
  });

  return latest;
}

function applyClampedLayout(
  current: DashboardSettings,
  panelPositions: PanelPositions,
  panelSizes: PanelSizes,
): DashboardSettings {
  const viewport = getCurrentViewport();
  const clamped = clampLayoutToViewport(panelPositions, panelSizes, viewport);

  return {
    ...current,
    panelPositions: clamped.panelPositions,
    panelSizes: clamped.panelSizes,
  };
}

interface SettingsContextValue {
  settings: DashboardSettings;
  updateTimezones: (timezones: TimezoneConfig[]) => void;
  updateFeedVisibility: (visibility: FeedVisibility) => void;
  toggleFocusMode: () => void;
  updateTodayIntention: (intention: string) => void;
  updateShortcuts: (shortcuts: ShortcutConfig) => void;
  reloadSettings: () => void;
  updatePanelPosition: (panelId: PanelId, position: PanelPosition) => void;
  updatePanelSize: (panelId: PanelId, size: { width: number; height: number }) => void;
  resetPanelLayout: () => void;
  applyViewportLayout: (layoutKey: string) => void;
  deleteViewportLayout: (layoutKey: string) => void;
  replaceAllSettings: (next: DashboardSettings) => void;
  activeViewportLayoutKey: string | null;
  updateWebexLastOpened: (roomId: string, timestamp: string) => void;
  updateWebexHiddenRooms: (roomIds: string[]) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<DashboardSettings>(() => loadSettings());
  const [activeViewportLayoutKey, setActiveViewportLayoutKey] = useState<string | null>(null);
  const resizeTimeoutRef = useRef<number | null>(null);
  const lastAppliedLayoutKeyRef = useRef<string | null>(null);

  const updateTimezones = useCallback((timezones: TimezoneConfig[]) => {
    persistSettings((current) => ({ ...current, timezones }), setSettings);
  }, []);

  const updateFeedVisibility = useCallback((visibility: FeedVisibility) => {
    persistSettings((current) => ({ ...current, feedVisibility: visibility }), setSettings);
  }, []);

  const toggleFocusMode = useCallback(() => {
    persistSettings((current) => ({ ...current, focusModeEnabled: !current.focusModeEnabled }), setSettings);
  }, []);

  const updateTodayIntention = useCallback((intention: string) => {
    persistSettings((current) => ({ ...current, todayIntention: intention }), setSettings);
  }, []);

  const updateShortcuts = useCallback((shortcuts: ShortcutConfig) => {
    persistSettings((current) => ({ ...current, shortcuts }), setSettings);
  }, []);

  const updatePanelPosition = useCallback((panelId: PanelId, position: PanelPosition) => {
    const viewport = getCurrentViewport();
    const viewportKey = viewport.width && viewport.height ? getViewportKey(viewport) : null;

    persistSettings((current) => {
      const currentPositions = current.panelPositions || {};
      const currentSizes = current.panelSizes || {};
      const nextPositions = {
        ...currentPositions,
        [panelId]: position,
      };

      const clamped = clampLayoutToViewport(nextPositions, currentSizes, viewport);
      const viewportLayouts = buildViewportLayouts(current, clamped.panelPositions, clamped.panelSizes);

      return {
        ...current,
        panelPositions: clamped.panelPositions,
        panelSizes: clamped.panelSizes,
        viewportLayouts,
      };
    }, setSettings);

    if (viewportKey) {
      lastAppliedLayoutKeyRef.current = viewportKey;
      setActiveViewportLayoutKey(viewportKey);
    }
  }, []);

  const updatePanelSize = useCallback(
    (panelId: PanelId, size: { width: number; height: number }) => {
      const viewport = getCurrentViewport();
      const viewportKey = viewport.width && viewport.height ? getViewportKey(viewport) : null;

      persistSettings((current) => {
        const currentPositions = current.panelPositions || {};
        const currentSizes = current.panelSizes || {};
        const nextSizes = {
          ...currentSizes,
          [panelId]: size,
        };

        const clamped = clampLayoutToViewport(currentPositions, nextSizes, viewport);
        const viewportLayouts = buildViewportLayouts(current, clamped.panelPositions, clamped.panelSizes);

        return {
          ...current,
          panelPositions: clamped.panelPositions,
          panelSizes: clamped.panelSizes,
          viewportLayouts,
        };
      }, setSettings);

      if (viewportKey) {
        lastAppliedLayoutKeyRef.current = viewportKey;
        setActiveViewportLayoutKey(viewportKey);
      }
    },
    [],
  );

  const reloadSettings = useCallback(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    const viewport = getCurrentViewport();
    const resolvedKey = resolveAppliedKeyForViewport(loaded.viewportLayouts || {}, viewport);
    setActiveViewportLayoutKey(resolvedKey);
    lastAppliedLayoutKeyRef.current = resolvedKey;
  }, []);

  const applyClosestViewportLayout = useCallback(() => {
    const viewport = getCurrentViewport();
    if (!viewport.width || !viewport.height) return;

    const current = loadSettings();
    const viewportLayouts = current.viewportLayouts || {};
    const match = findBestMatchingViewportLayout(viewportLayouts, viewport);
    if (!match) return;
    if (lastAppliedLayoutKeyRef.current === match.key) return;

    const applied = applyClampedLayout(current, match.layout.panelPositions, match.layout.panelSizes);
    const updated = replaceSettingsStorage(applied);
    lastAppliedLayoutKeyRef.current = match.key;
    setActiveViewportLayoutKey(match.key);
    setSettings(updated);
  }, []);

  const applyViewportLayout = useCallback((layoutKey: string) => {
    const current = loadSettings();
    const layout = current.viewportLayouts?.[layoutKey];
    if (!layout) return;

    const applied = applyClampedLayout(current, layout.panelPositions, layout.panelSizes);
    const updated = replaceSettingsStorage(applied);
    lastAppliedLayoutKeyRef.current = layoutKey;
    setActiveViewportLayoutKey(layoutKey);
    setSettings(updated);
  }, []);

  const deleteViewportLayout = useCallback((layoutKey: string) => {
    if (activeViewportLayoutKey === layoutKey) return;

    let deleted = false;
    persistSettings((current) => {
      const viewportLayouts = { ...(current.viewportLayouts || {}) };
      if (!viewportLayouts[layoutKey]) {
        return current;
      }

      delete viewportLayouts[layoutKey];
      deleted = true;
      return {
        ...current,
        viewportLayouts,
      };
    }, setSettings);

    if (!deleted) return;

    if (lastAppliedLayoutKeyRef.current === layoutKey) {
      lastAppliedLayoutKeyRef.current = null;
    }
  }, [activeViewportLayoutKey]);

  const replaceAllSettings = useCallback((next: DashboardSettings) => {
    const viewport = getCurrentViewport();
    const clamped = clampLayoutToViewport(next.panelPositions || {}, next.panelSizes || {}, viewport);
    const merged = {
      ...next,
      panelPositions: clamped.panelPositions,
      panelSizes: clamped.panelSizes,
    };
    const updated = replaceSettingsStorage(merged);
    setSettings(updated);
    const resolvedKey = resolveAppliedKeyForViewport(updated.viewportLayouts || {}, viewport);
    setActiveViewportLayoutKey(resolvedKey);
    lastAppliedLayoutKeyRef.current = resolvedKey;
  }, []);

  useEffect(() => {
    applyClosestViewportLayout();

    if (typeof window === 'undefined') return;

    const handleResize = () => {
      if (resizeTimeoutRef.current !== null) {
        window.clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = window.setTimeout(() => {
        applyClosestViewportLayout();
      }, RESIZE_APPLY_DEBOUNCE_MS);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current !== null) {
        window.clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [applyClosestViewportLayout]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== SETTINGS_KEY) return;
      const latest = loadSettings();
      setSettings(latest);

      const viewport = getCurrentViewport();
      const resolvedKey = resolveAppliedKeyForViewport(latest.viewportLayouts || {}, viewport);
      setActiveViewportLayoutKey(resolvedKey);
      lastAppliedLayoutKeyRef.current = resolvedKey;
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const resetPanelLayout = useCallback(() => {
    const updated = resetPanelLayoutStorage();
    lastAppliedLayoutKeyRef.current = null;
    setActiveViewportLayoutKey(null);
    setSettings(updated);
  }, []);

  const updateWebexLastOpened = useCallback((roomId: string, timestamp: string) => {
    persistSettings(
      (current) => {
        const currentLastOpened = current.webexLastOpened || {};
        return {
          ...current,
          webexLastOpened: {
            ...currentLastOpened,
            [roomId]: timestamp,
          },
        };
      },
      setSettings,
    );
  }, []);

  const updateWebexHiddenRooms = useCallback((roomIds: string[]) => {
    persistSettings((current) => ({ ...current, webexHiddenRooms: roomIds }), setSettings);
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateTimezones,
        updateFeedVisibility,
        toggleFocusMode,
        updateTodayIntention,
        updateShortcuts,
        reloadSettings,
        updatePanelPosition,
        updatePanelSize,
        resetPanelLayout,
        applyViewportLayout,
        deleteViewportLayout,
        replaceAllSettings,
        activeViewportLayoutKey,
        updateWebexLastOpened,
        updateWebexHiddenRooms,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
