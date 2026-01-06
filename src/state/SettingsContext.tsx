import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  DashboardSettings,
  TimezoneConfig,
  FeedVisibility,
  ShortcutConfig,
  PanelId,
  PanelPosition,
} from '../types';
import {
  loadSettings,
  updateTimezones as updateTimezonesStorage,
  updateFeedVisibility as updateFeedVisibilityStorage,
  toggleFocusMode as toggleFocusModeStorage,
  updateTodayIntention as updateTodayIntentionStorage,
  updateShortcuts as updateShortcutsStorage,
  updatePanelPositions as updatePanelPositionsStorage,
  updatePanelSizes as updatePanelSizesStorage,
  resetPanelLayout as resetPanelLayoutStorage,
  updateSettings as updateSettingsStorage,
} from './settings';

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
  updateWebexLastOpened: (roomId: string, timestamp: string) => void;
  updateWebexHiddenRooms: (roomIds: string[]) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<DashboardSettings>(() => loadSettings());

  const updateTimezones = useCallback((timezones: TimezoneConfig[]) => {
    const updated = updateTimezonesStorage(timezones);
    setSettings(updated);
  }, []);

  const updateFeedVisibility = useCallback((visibility: FeedVisibility) => {
    const updated = updateFeedVisibilityStorage(visibility);
    setSettings(updated);
  }, []);

  const toggleFocusMode = useCallback(() => {
    const updated = toggleFocusModeStorage();
    setSettings(updated);
  }, []);

  const updateTodayIntention = useCallback((intention: string) => {
    const updated = updateTodayIntentionStorage(intention);
    setSettings(updated);
  }, []);

  const updateShortcuts = useCallback((shortcuts: ShortcutConfig) => {
    const updated = updateShortcutsStorage(shortcuts);
    setSettings(updated);
  }, []);

  const updatePanelPosition = useCallback((panelId: PanelId, position: PanelPosition) => {
    const current = loadSettings();
    const currentPositions = current.panelPositions || {};
    const nextPositions = {
      ...currentPositions,
      [panelId]: position,
    };
    const updated = updatePanelPositionsStorage(nextPositions);
    setSettings(updated as DashboardSettings);
  }, []);

  const updatePanelSize = useCallback(
    (panelId: PanelId, size: { width: number; height: number }) => {
      const current = loadSettings();
      const currentSizes = current.panelSizes || {};
      const nextSizes = {
        ...currentSizes,
        [panelId]: size,
      };
      const updated = updatePanelSizesStorage(nextSizes);
      setSettings(updated as DashboardSettings);
    },
    [],
  );

  const reloadSettings = useCallback(() => {
    setSettings(loadSettings());
  }, []);

  const resetPanelLayout = useCallback(() => {
    const updated = resetPanelLayoutStorage();
    setSettings(updated);
  }, []);

  const updateWebexLastOpened = useCallback((roomId: string, timestamp: string) => {
    const current = loadSettings();
    const currentLastOpened = current.webexLastOpened || {};
    const updated = updateSettingsStorage({
      webexLastOpened: {
        ...currentLastOpened,
        [roomId]: timestamp,
      },
    });
    setSettings(updated);
  }, []);

  const updateWebexHiddenRooms = useCallback((roomIds: string[]) => {
    const updated = updateSettingsStorage({
      webexHiddenRooms: roomIds,
    });
    setSettings(updated);
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
