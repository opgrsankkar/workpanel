import { useHotkeys } from 'react-hotkeys-hook';
import { useSettings } from '../state/SettingsContext';

interface UseKeyboardShortcutsProps {
  onStartStopPomodoro: () => void;
  onAddTask: () => void;
  onFocusEditor: () => void;
  onNewNote: () => void;
  onOpenNoteSearch: () => void;
  onCloseActiveNote: () => void;
  onNextNote: () => void;
  onLogInterrupt: () => void;
  onRefreshTasks: () => void;
}

export function useKeyboardShortcuts({
  onStartStopPomodoro,
  onAddTask,
  onFocusEditor,
  onNewNote,
  onOpenNoteSearch,
  onCloseActiveNote,
  onNextNote,
  onLogInterrupt,
  onRefreshTasks,
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

  // Toggle focus mode
  useHotkeys(
    shortcuts.toggleFocusMode,
    (e) => {
      e.preventDefault();
      toggleFocusMode();
    },
    { enableOnFormTags: false }
  );

  // New note in editor
  useHotkeys(
    shortcuts.newNote,
    (e) => {
      e.preventDefault();
      onNewNote();
    },
    { enableOnFormTags: false }
  );

  useHotkeys(
    shortcuts.openNoteSearch,
    (e) => {
      e.preventDefault();
      onOpenNoteSearch();
    },
    { enableOnFormTags: false }
  );

  useHotkeys(
    shortcuts.closeActiveNote,
    (e) => {
      e.preventDefault();
      onCloseActiveNote();
    },
    { enableOnFormTags: false }
  );

  useHotkeys(
    shortcuts.nextNote,
    (e) => {
      e.preventDefault();
      onNextNote();
    },
    { enableOnFormTags: false }
  );

  useHotkeys(
    shortcuts.logInterrupt,
    (e) => {
      e.preventDefault();
      onLogInterrupt();
    },
    { enableOnFormTags: false }
  );

  useHotkeys(
    shortcuts.refreshTasks,
    (e) => {
      e.preventDefault();
      onRefreshTasks();
    },
    { enableOnFormTags: false }
  );
}
