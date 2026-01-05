import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  DashboardSettings,
  TimezoneConfig,
  FeedVisibility,
  ShortcutConfig,
} from '../types';
import {
  loadSettings,
  updateTimezones as updateTimezonesStorage,
  updateFeedVisibility as updateFeedVisibilityStorage,
  toggleFocusMode as toggleFocusModeStorage,
  updateTodayIntention as updateTodayIntentionStorage,
  updateShortcuts as updateShortcutsStorage,
} from './settings';

interface SettingsContextValue {
  settings: DashboardSettings;
  updateTimezones: (timezones: TimezoneConfig[]) => void;
  updateFeedVisibility: (visibility: FeedVisibility) => void;
  toggleFocusMode: () => void;
  updateTodayIntention: (intention: string) => void;
  updateShortcuts: (shortcuts: ShortcutConfig) => void;
  reloadSettings: () => void;
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

  const reloadSettings = useCallback(() => {
    setSettings(loadSettings());
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
