import {
  DashboardSettings,
  TimezoneConfig,
  FeedVisibility,
  ShortcutConfig,
  PanelId,
  PanelPosition,
  PanelPositions,
  PanelSize,
  PanelSizes,
  ViewportLayout,
  ViewportLayouts,
} from '../types';

export const SETTINGS_SCHEMA_VERSION = 2;
export const SETTINGS_KEY = 'dashboard.settings';

const PANEL_IDS: PanelId[] = [
  'pomodoro',
  'intention',
  'clocks',
  'interrupts',
  'editor',
  'feeds',
  'tasks',
  'summary',
  'webex',
];

const DEFAULT_TIMEZONES: TimezoneConfig[] = [
  { id: '1', label: 'Local', tz: Intl.DateTimeFormat().resolvedOptions().timeZone },
  { id: '2', label: 'UTC', tz: 'UTC' },
  { id: '3', label: 'New York', tz: 'America/New_York' },
  { id: '4', label: 'Tokyo', tz: 'Asia/Tokyo' },
];

const DEFAULT_FEED_VISIBILITY: FeedVisibility = {
  hackerNews: true,
  reuters: true,
};

const DEFAULT_SHORTCUTS: ShortcutConfig = {
  startStopPomodoro: 'alt+p',
  addTask: 'alt+t',
  focusEditor: 'alt+e',
  toggleFeeds: 'alt+f',
  toggleFocusMode: 'alt+m',
};

const DEFAULT_PANEL_POSITIONS: PanelPositions = {
  pomodoro: { x: 0, y: 0 },
  intention: { x: 340, y: 0 },
  clocks: { x: 700, y: 0 },
  interrupts: { x: 1000, y: 0 },
  editor: { x: 340, y: 140 },
  feeds: { x: 1000, y: 140 },
  tasks: { x: 0, y: 220 },
  summary: { x: 0, y: 420 },
  webex: { x: 1340, y: 0 },
};

export const DEFAULT_PANEL_SIZES: PanelSizes = {
  pomodoro: { width: 320, height: 260 },
  intention: { width: 420, height: 140 },
  clocks: { width: 288, height: 140 },
  interrupts: { width: 256, height: 160 },
  editor: { width: 720, height: 520 },
  feeds: { width: 320, height: 520 },
  tasks: { width: 320, height: 320 },
  summary: { width: 320, height: 160 },
  webex: { width: 320, height: 400 },
};

const DEFAULT_SETTINGS: DashboardSettings = {
  settingsVersion: SETTINGS_SCHEMA_VERSION,
  timezones: DEFAULT_TIMEZONES,
  feedVisibility: DEFAULT_FEED_VISIBILITY,
  focusModeEnabled: false,
  shortcuts: DEFAULT_SHORTCUTS,
  todayIntention: '',
  panelPositions: DEFAULT_PANEL_POSITIONS,
  panelSizes: DEFAULT_PANEL_SIZES,
  viewportLayouts: {},
};

export interface SettingsTransferBundle {
  version: number;
  exportedAt: string;
  settings: DashboardSettings;
  vaultPayload?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function safeNumber(value: unknown, fallback: number, min = -Infinity, max = Infinity): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function sanitizePanelPosition(input: unknown, fallback: PanelPosition): PanelPosition {
  if (!isRecord(input)) return fallback;
  return {
    x: safeNumber(input.x, fallback.x),
    y: safeNumber(input.y, fallback.y),
  };
}

function sanitizePanelSize(input: unknown, fallback: PanelSize): PanelSize {
  if (!isRecord(input)) return fallback;
  return {
    width: safeNumber(input.width, fallback.width, 120, 3000),
    height: safeNumber(input.height, fallback.height, 100, 3000),
  };
}

function sanitizePanelPositions(input: unknown): PanelPositions {
  const sanitized: PanelPositions = {};
  const value = isRecord(input) ? input : {};
  for (const panelId of PANEL_IDS) {
    const fallback = DEFAULT_PANEL_POSITIONS[panelId] || { x: 0, y: 0 };
    sanitized[panelId] = sanitizePanelPosition(value[panelId], fallback);
  }
  return sanitized;
}

function sanitizePanelSizes(input: unknown): PanelSizes {
  const sanitized: PanelSizes = {};
  const value = isRecord(input) ? input : {};
  for (const panelId of PANEL_IDS) {
    const fallback = DEFAULT_PANEL_SIZES[panelId] || { width: 320, height: 240 };
    sanitized[panelId] = sanitizePanelSize(value[panelId], fallback);
  }
  return sanitized;
}

function sanitizeTimezoneConfig(input: unknown, index: number): TimezoneConfig | null {
  if (!isRecord(input)) return null;
  if (typeof input.label !== 'string' || !input.label.trim()) return null;
  if (typeof input.tz !== 'string' || !input.tz.trim()) return null;
  const id = typeof input.id === 'string' && input.id.trim() ? input.id : `tz-${index + 1}`;
  return { id, label: input.label.trim(), tz: input.tz.trim() };
}

function sanitizeViewportLayout(input: unknown): ViewportLayout | null {
  if (!isRecord(input)) return null;
  const viewportWidth = safeNumber(input.viewportWidth, 0, 1, 10000);
  const viewportHeight = safeNumber(input.viewportHeight, 0, 1, 10000);
  if (!viewportWidth || !viewportHeight) return null;

  const updatedAtRaw = typeof input.updatedAt === 'string' ? input.updatedAt : '';
  const updatedAt = Number.isNaN(Date.parse(updatedAtRaw))
    ? new Date(0).toISOString()
    : new Date(updatedAtRaw).toISOString();

  return {
    viewportWidth,
    viewportHeight,
    devicePixelRatio: safeNumber(input.devicePixelRatio, 1, 0.1, 8),
    screenWidth: safeNumber(input.screenWidth, viewportWidth, 1, 20000),
    screenHeight: safeNumber(input.screenHeight, viewportHeight, 1, 20000),
    visualScale: safeNumber(input.visualScale, 1, 0.1, 10),
    panelPositions: sanitizePanelPositions(input.panelPositions),
    panelSizes: sanitizePanelSizes(input.panelSizes),
    updatedAt,
  };
}

function sanitizeViewportLayouts(input: unknown): ViewportLayouts {
  const value = isRecord(input) ? input : {};
  const sanitized: ViewportLayouts = {};

  for (const [key, layout] of Object.entries(value)) {
    if (!key.trim()) continue;
    const clean = sanitizeViewportLayout(layout);
    if (!clean) continue;
    sanitized[key] = clean;
  }

  return sanitized;
}

function migrateSettings(raw: unknown): Record<string, unknown> {
  if (!isRecord(raw)) return {};

  const migrated: Record<string, unknown> = { ...raw };
  const version = typeof raw.settingsVersion === 'number' ? raw.settingsVersion : 1;

  if (version < 2) {
    migrated.settingsVersion = 2;
  }

  return migrated;
}

function normalizeSettings(raw: unknown): DashboardSettings {
  const migrated = migrateSettings(raw);

  const rawTimezones = Array.isArray(migrated.timezones) ? migrated.timezones : DEFAULT_TIMEZONES;
  const timezones = rawTimezones
    .map((value, index) => sanitizeTimezoneConfig(value, index))
    .filter((value): value is TimezoneConfig => value !== null);

  const feedVisibilityInput = isRecord(migrated.feedVisibility) ? migrated.feedVisibility : {};
  const shortcutsInput = isRecord(migrated.shortcuts) ? migrated.shortcuts : {};
  const webexLastOpened: Record<string, string> | undefined = isRecord(migrated.webexLastOpened)
    ? Object.entries(migrated.webexLastOpened).reduce<Record<string, string>>((acc, [key, value]) => {
        if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
          return acc;
        }
        acc[key] = value;
        return acc;
      }, {})
    : undefined;

  const normalized: DashboardSettings = {
    settingsVersion: SETTINGS_SCHEMA_VERSION,
    timezones: timezones.length ? timezones : DEFAULT_TIMEZONES,
    feedVisibility: {
      hackerNews:
        typeof feedVisibilityInput.hackerNews === 'boolean'
          ? feedVisibilityInput.hackerNews
          : DEFAULT_FEED_VISIBILITY.hackerNews,
      reuters:
        typeof feedVisibilityInput.reuters === 'boolean'
          ? feedVisibilityInput.reuters
          : DEFAULT_FEED_VISIBILITY.reuters,
    },
    focusModeEnabled:
      typeof migrated.focusModeEnabled === 'boolean'
        ? migrated.focusModeEnabled
        : DEFAULT_SETTINGS.focusModeEnabled,
    shortcuts: {
      startStopPomodoro:
        typeof shortcutsInput.startStopPomodoro === 'string' && shortcutsInput.startStopPomodoro.trim()
          ? shortcutsInput.startStopPomodoro
          : DEFAULT_SHORTCUTS.startStopPomodoro,
      addTask:
        typeof shortcutsInput.addTask === 'string' && shortcutsInput.addTask.trim()
          ? shortcutsInput.addTask
          : DEFAULT_SHORTCUTS.addTask,
      focusEditor:
        typeof shortcutsInput.focusEditor === 'string' && shortcutsInput.focusEditor.trim()
          ? shortcutsInput.focusEditor
          : DEFAULT_SHORTCUTS.focusEditor,
      toggleFeeds:
        typeof shortcutsInput.toggleFeeds === 'string' && shortcutsInput.toggleFeeds.trim()
          ? shortcutsInput.toggleFeeds
          : DEFAULT_SHORTCUTS.toggleFeeds,
      toggleFocusMode:
        typeof shortcutsInput.toggleFocusMode === 'string' && shortcutsInput.toggleFocusMode.trim()
          ? shortcutsInput.toggleFocusMode
          : DEFAULT_SHORTCUTS.toggleFocusMode,
    },
    todayIntention: typeof migrated.todayIntention === 'string' ? migrated.todayIntention : '',
    panelPositions: sanitizePanelPositions(migrated.panelPositions),
    panelSizes: sanitizePanelSizes(migrated.panelSizes),
    viewportLayouts: sanitizeViewportLayouts(migrated.viewportLayouts),
    webexLastOpened,
    webexHiddenRooms: Array.isArray(migrated.webexHiddenRooms)
      ? migrated.webexHiddenRooms.filter((value): value is string => typeof value === 'string')
      : undefined,
  };

  return normalized;
}

export function loadSettings(): DashboardSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return { ...DEFAULT_SETTINGS };

    const parsed = JSON.parse(stored);
    const normalized = normalizeSettings(parsed);
    return normalized;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: DashboardSettings): void {
  const normalized = normalizeSettings(settings);
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
}

export function updateSettings(partial: Partial<DashboardSettings>): DashboardSettings {
  const current = loadSettings();
  const updated = normalizeSettings({ ...current, ...partial });
  saveSettings(updated);
  return updated;
}

export function replaceSettings(next: DashboardSettings): DashboardSettings {
  const normalized = normalizeSettings(next);
  saveSettings(normalized);
  return normalized;
}

export function buildSettingsTransferBundle(vaultPayload?: unknown): SettingsTransferBundle {
  return {
    version: SETTINGS_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    settings: loadSettings(),
    ...(vaultPayload !== undefined ? { vaultPayload } : {}),
  };
}

export function parseSettingsTransferBundle(raw: string): SettingsTransferBundle {
  const parsed = JSON.parse(raw);
  if (!isRecord(parsed) || !isRecord(parsed.settings)) {
    throw new Error('Invalid settings file');
  }

  const version = typeof parsed.version === 'number' ? parsed.version : 1;
  const exportedAt =
    typeof parsed.exportedAt === 'string' && !Number.isNaN(Date.parse(parsed.exportedAt))
      ? parsed.exportedAt
      : new Date().toISOString();

  return {
    version,
    exportedAt,
    settings: normalizeSettings(parsed.settings),
    ...(Object.prototype.hasOwnProperty.call(parsed, 'vaultPayload')
      ? { vaultPayload: parsed.vaultPayload }
      : {}),
  };
}

// Specific update helpers
export function updateTimezones(timezones: TimezoneConfig[]): DashboardSettings {
  return updateSettings({ timezones });
}

export function updateFeedVisibility(feedVisibility: FeedVisibility): DashboardSettings {
  return updateSettings({ feedVisibility });
}

export function toggleFocusMode(): DashboardSettings {
  const current = loadSettings();
  return updateSettings({ focusModeEnabled: !current.focusModeEnabled });
}

export function updateTodayIntention(intention: string): DashboardSettings {
  return updateSettings({ todayIntention: intention });
}

export function updateShortcuts(shortcuts: ShortcutConfig): DashboardSettings {
  return updateSettings({ shortcuts });
}

export function updatePanelPositions(panelPositions: PanelPositions): DashboardSettings {
  return updateSettings({ panelPositions });
}

export function updatePanelSizes(panelSizes: PanelSizes): DashboardSettings {
  return updateSettings({ panelSizes });
}

export function resetPanelLayout(): DashboardSettings {
  const topLeftPositions: PanelPositions = {
    pomodoro: { x: 0, y: 0 },
    intention: { x: 0, y: 0 },
    clocks: { x: 0, y: 0 },
    interrupts: { x: 0, y: 0 },
    editor: { x: 0, y: 0 },
    feeds: { x: 0, y: 0 },
    tasks: { x: 0, y: 0 },
    summary: { x: 0, y: 0 },
    webex: { x: 0, y: 0 },
  };

  return updateSettings({
    panelPositions: topLeftPositions,
    panelSizes: DEFAULT_PANEL_SIZES,
    viewportLayouts: {},
  });
}
