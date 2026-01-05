import {
  DashboardSettings,
  TimezoneConfig,
  FeedVisibility,
  ShortcutConfig,
  PanelPositions,
  PanelSizes,
} from '../types';

const SETTINGS_KEY = 'dashboard.settings';

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
};

const DEFAULT_SETTINGS: DashboardSettings = {
  timezones: DEFAULT_TIMEZONES,
  feedVisibility: DEFAULT_FEED_VISIBILITY,
  focusModeEnabled: false,
  shortcuts: DEFAULT_SHORTCUTS,
  todayIntention: '',
   panelPositions: DEFAULT_PANEL_POSITIONS,
  panelSizes: DEFAULT_PANEL_SIZES,
};

export function loadSettings(): DashboardSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return { ...DEFAULT_SETTINGS };
    
    const parsed = JSON.parse(stored);
    const merged: DashboardSettings = {
      ...DEFAULT_SETTINGS,
      ...parsed,
      timezones: parsed.timezones || DEFAULT_TIMEZONES,
      feedVisibility: { ...DEFAULT_FEED_VISIBILITY, ...parsed.feedVisibility },
      shortcuts: { ...DEFAULT_SHORTCUTS, ...parsed.shortcuts },
      panelPositions: parsed.panelPositions || DEFAULT_PANEL_POSITIONS,
      panelSizes: parsed.panelSizes || DEFAULT_PANEL_SIZES,
    };
    return merged;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: DashboardSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function updateSettings(partial: Partial<DashboardSettings>): DashboardSettings {
  const current = loadSettings();
  const updated = { ...current, ...partial };
  saveSettings(updated);
  return updated;
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
  };

  return updateSettings({
    panelPositions: topLeftPositions,
    panelSizes: DEFAULT_PANEL_SIZES,
  });
}
