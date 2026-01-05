import { useHotkeys } from 'react-hotkeys-hook';
import { useSettings } from '../state/SettingsContext';

interface UseKeyboardShortcutsProps {
  onStartStopPomodoro: () => void;
  onAddTask: () => void;
  onFocusEditor: () => void;
  onToggleFeeds: () => void;
}

export function useKeyboardShortcuts({
  onStartStopPomodoro,
  onAddTask,
  onFocusEditor,
  onToggleFeeds,
}: UseKeyboardShortcutsProps) {
  const { settings, toggleFocusMode } = useSettings();
  const shortcuts = settings.shortcuts;

  // Start/stop pomodoro
  useHotkeys(
    shortcuts.startStopPomodoro,
    (e) => {
      e.preventDefault();
      onStartStopPomodoro();
    },
    { enableOnFormTags: false }
  );

  // Add task
  useHotkeys(
    shortcuts.addTask,
    (e) => {
      e.preventDefault();
      onAddTask();
    },
    { enableOnFormTags: false }
  );

  // Focus editor
  useHotkeys(
    shortcuts.focusEditor,
    (e) => {
      e.preventDefault();
      onFocusEditor();
    },
    { enableOnFormTags: false }
  );

  // Toggle feeds visibility
  useHotkeys(
    shortcuts.toggleFeeds,
    (e) => {
      e.preventDefault();
      onToggleFeeds();
    },
    { enableOnFormTags: false }
  );

  // Toggle focus mode
  useHotkeys(
    shortcuts.toggleFocusMode,
    (e) => {
      e.preventDefault();
      toggleFocusMode();
    },
    { enableOnFormTags: false }
  );
}
