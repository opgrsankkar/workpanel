import { DashboardSettings, TimezoneConfig, FeedVisibility, ShortcutConfig } from '../types';

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

const DEFAULT_SETTINGS: DashboardSettings = {
  timezones: DEFAULT_TIMEZONES,
  feedVisibility: DEFAULT_FEED_VISIBILITY,
  focusModeEnabled: false,
  shortcuts: DEFAULT_SHORTCUTS,
  todayIntention: '',
};

export function loadSettings(): DashboardSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return { ...DEFAULT_SETTINGS };
    
    const parsed = JSON.parse(stored);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      timezones: parsed.timezones || DEFAULT_TIMEZONES,
      feedVisibility: { ...DEFAULT_FEED_VISIBILITY, ...parsed.feedVisibility },
      shortcuts: { ...DEFAULT_SHORTCUTS, ...parsed.shortcuts },
    };
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
