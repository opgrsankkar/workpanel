import { useState, useEffect, useCallback, useRef } from 'react';
import { SettingsProvider, useSettings } from './state/SettingsContext';
import { VaultProvider, useVault } from './state/VaultContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MultiClockPanel } from './components/clock/MultiClockPanel';
import { IntentionPanel } from './components/intention/IntentionPanel';
import { TodoistPanel } from './components/todoist/TodoistPanel';
import { PomodoroTimer } from './components/pomodoro/PomodoroTimer';
import { InterruptPanel } from './components/productivity/InterruptPanel';
import { DailySummaryPanel } from './components/productivity/DailySummaryPanel';
import { MonacoPanel } from './components/editor/MonacoPanel';
import { FeedPanel } from './components/feeds/FeedPanel';
import { TaskSelectorModal } from './components/modals/TaskSelectorModal';
import { ShortcutsHelp } from './components/shortcuts/ShortcutsHelp';
import { FocusModeIndicator } from './components/ui/FocusModeIndicator';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { 
  TodoistTask, 
  PomodoroSession, 
  InterruptLog, 
  TaskCompletionEvent,
  DailySummary 
} from './types';
import { 
  PomodoroRepository, 
  InterruptRepository, 
  TaskCompletionRepository 
} from './db';
import { getDateKey } from './utils/dateUtils';
import { fetchTasks } from './api/todoist';
import { SettingsPanel } from './components/modals/SettingsPanel.tsx';

function DashboardContent() {
  const { settings, updateFeedVisibility } = useSettings();
  const { isUnlocked, getToken } = useVault();
  const editorRef = useRef<unknown>(null);

  // State
  const [tasks, setTasks] = useState<TodoistTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<TodoistTask | null>(null);
  const [attachedTask, setAttachedTask] = useState<TodoistTask | null>(null);
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [interrupts, setInterrupts] = useState<InterruptLog[]>([]);
  const [summary, setSummary] = useState<DailySummary>({
    date: getDateKey(),
    pomodorosCompleted: 0,
    totalFocusMinutes: 0,
    tasksCompleted: 0,
    interruptionsLogged: 0,
    completedTasks: [],
  });
  const [_showAddTaskFromShortcut, _setShowAddTaskFromShortcut] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  // Reserved for future use: const pomodoroRef = useRef<{ toggle: () => void } | null>(null);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const today = getDateKey();

        // Load interrupts
        const todayInterrupts = await InterruptRepository.getByDate(today);
        setInterrupts(todayInterrupts);

        // Load summary data
        const pomodoros = await PomodoroRepository.getByDate(today);
        const completedPomodoros = pomodoros.filter(p => p.status === 'completed');
        const completions = await TaskCompletionRepository.getByDate(today);

        setSummary({
          date: today,
          pomodorosCompleted: completedPomodoros.length,
          totalFocusMinutes: completedPomodoros.reduce((sum, p) => sum + p.durationMinutes, 0),
          tasksCompleted: completions.length,
          interruptionsLogged: todayInterrupts.length,
          completedTasks: completions,
        });
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      }

      // Load tasks for selector
      try {
        if (isUnlocked) {
          const token = getToken('todoist');
          if (token) {
            const fetchedTasks = await fetchTasks(token);
            setTasks(fetchedTasks);
          }
        }
      } catch (err) {
        console.error('Failed to load tasks:', err);
      }
    };

    loadData();
  }, [isUnlocked, getToken]);

  // Handle pomodoro completion
  const handlePomodoroComplete = useCallback((session: PomodoroSession) => {
    setSummary(prev => ({
      ...prev,
      pomodorosCompleted: prev.pomodorosCompleted + 1,
      totalFocusMinutes: prev.totalFocusMinutes + session.durationMinutes,
    }));
  }, []);

  // Handle interrupt added
  const handleInterruptAdded = useCallback((log: InterruptLog) => {
    setInterrupts(prev => [log, ...prev]);
    setSummary(prev => ({
      ...prev,
      interruptionsLogged: prev.interruptionsLogged + 1,
    }));
  }, []);

  // Handle task completed
  const handleTaskCompleted = useCallback((event: TaskCompletionEvent) => {
    setSummary(prev => ({
      ...prev,
      tasksCompleted: prev.tasksCompleted + 1,
      completedTasks: [...prev.completedTasks, event],
    }));
    // Remove from local tasks
    setTasks(prev => prev.filter(t => t.id !== event.todoistTaskId));
  }, []);

  // Handle task selection for pomodoro
  const handleTaskAttach = useCallback(() => {
    setShowTaskSelector(true);
  }, []);

  const handleTaskSelect = useCallback((task: TodoistTask | null) => {
    setAttachedTask(task);
    setShowTaskSelector(false);
  }, []);

  // Keyboard shortcut handlers
  const handleStartStopPomodoro = useCallback(() => {
    // This will be connected to the pomodoro timer's toggle function
    const timerElement = document.querySelector('[data-pomodoro-toggle]') as HTMLButtonElement;
    if (timerElement) {
      timerElement.click();
    }
  }, []);

  const handleAddTask = useCallback(() => {
    // Trigger the add task UI in TodoistPanel
    const addBtn = document.querySelector('[data-add-task-btn]') as HTMLButtonElement;
    if (addBtn) addBtn.click();
  }, []);

  const handleFocusEditor = useCallback(() => {
    if (editorRef.current && typeof (editorRef.current as { focus?: () => void }).focus === 'function') {
      (editorRef.current as { focus: () => void }).focus();
    }
  }, []);

  const handleToggleFeeds = useCallback(() => {
    const current = settings.feedVisibility;
    const allHidden = !current.hackerNews && !current.reuters;
    updateFeedVisibility({
      hackerNews: allHidden,
      reuters: allHidden,
    });
  }, [settings.feedVisibility, updateFeedVisibility]);

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    onStartStopPomodoro: handleStartStopPomodoro,
    onAddTask: handleAddTask,
    onFocusEditor: handleFocusEditor,
    onToggleFeeds: handleToggleFeeds,
  });

  const feedsVisible = settings.feedVisibility.hackerNews || settings.feedVisibility.reuters;
  const focusMode = settings.focusModeEnabled;

  return (
    <div className="h-screen w-screen bg-dashboard-bg p-4 overflow-hidden">
      {/* Main grid layout - optimized for 16:9 */}
      <div className="h-full grid grid-cols-12 grid-rows-6 gap-4">
        
        {/* Row 1-2: Pomodoro (left, 2 rows) + Intention (top center) + Clocks (top right) */}
        <div className="col-span-3 row-span-2">
          <PomodoroTimer
            attachedTask={attachedTask}
            onTaskAttach={handleTaskAttach}
            onComplete={handlePomodoroComplete}
            onInterrupt={() => {
              // Trigger interrupt log
              const btn = document.querySelector('[data-interrupt-quick]') as HTMLButtonElement;
              if (btn) btn.click();
            }}
          />
        </div>
        <div className="col-span-4 row-span-1">
          <IntentionPanel />
        </div>
        <div className="col-span-5 row-span-1">
          <MultiClockPanel />
        </div>

        {/* Row 2-6: Editor (center, extends to bottom) + Interrupts/Feeds (right) */}
        <div className={`col-span-6 row-span-5 ${focusMode ? '' : ''}`}>
          <MonacoPanel editorRef={editorRef} />
        </div>

        <div className="col-span-3 row-span-5 flex flex-col gap-4">
          <div className="flex-1">
            <InterruptPanel
              interrupts={interrupts}
              onInterruptAdded={handleInterruptAdded}
            />
          </div>
          <div className={`flex-1 ${focusMode ? 'focus-hidden' : ''}`}>
            <FeedPanel visible={feedsVisible && !focusMode} />
          </div>
        </div>

        {/* Row 3-5: Tasks (left) */}
        <div className="col-span-3 row-span-3">
          <TodoistPanel
            onTaskSelect={(task) => setSelectedTask(task)}
            selectedTaskId={selectedTask?.id || null}
            onTaskCompleted={handleTaskCompleted}
          />
        </div>

        {/* Row 6: Summary (left only) */}
        <div className="col-span-3 row-span-1">
          <DailySummaryPanel summary={summary} />
        </div>
      </div>

      {/* Task selector modal */}
      {showTaskSelector && (
        <TaskSelectorModal
          tasks={tasks}
          onSelect={handleTaskSelect}
          onClose={() => setShowTaskSelector(false)}
        />
      )}

      {/* Focus mode indicator */}
      <FocusModeIndicator />

      {/* Shortcuts help */}
      <ShortcutsHelp />

      {/* Settings button and panel */}
      <button
        type="button"
        className="fixed bottom-4 left-4 z-40 w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white flex items-center justify-center text-sm"
        onClick={() => setShowSettings(true)}
        aria-label="Open settings"
      >
        ⚙
      </button>

      <SettingsPanel open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}

function DashboardShell() {
  const { hasVault, isUnlocked, setMasterPassword, unlock, clearVault } = useVault();
  const [createPassword, setCreatePassword] = useState('');
  const [unlockPassword, setUnlockPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!createPassword.trim()) return;
    try {
      await setMasterPassword(createPassword);
      setCreatePassword('');
      setError(null);
    } catch (e) {
      console.error('Failed to set dashboard password:', e);
      setError('Failed to set password');
    }
  };

  const handleUnlock = async () => {
    if (!unlockPassword.trim()) return;
    const ok = await unlock(unlockPassword);
    if (!ok) {
      setError('Incorrect password');
      return;
    }
    setUnlockPassword('');
    setError(null);
  };

  if (!hasVault) {
    return (
      <div className="h-screen w-screen bg-dashboard-bg flex items-center justify-center">
        <div className="panel max-w-sm w-full">
          <h2 className="panel-header">Dashboard Password</h2>
          <p className="text-sm text-slate-400 mb-3">
            Set a password to protect your API keys and other sensitive data. This password is kept only in your browser and never sent to a server.
          </p>
          {error && <p className="text-sm text-danger mb-2">{error}</p>}
          <div className="space-y-2">
            <input
              type="password"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              placeholder="New dashboard password"
              className="input"
            />
            <button onClick={handleCreate} className="btn btn-primary text-xs">
              Save Password
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="h-screen w-screen bg-dashboard-bg flex items-center justify-center">
        <div className="panel max-w-sm w-full">
          <h2 className="panel-header">Unlock Dashboard</h2>
          <p className="text-sm text-slate-400 mb-3">
            Enter your dashboard password to unlock saved API keys.
          </p>
          {error && <p className="text-sm text-danger mb-2">{error}</p>}
          <div className="space-y-2">
            <input
              type="password"
              value={unlockPassword}
              onChange={(e) => setUnlockPassword(e.target.value)}
              placeholder="Dashboard password"
              className="input"
            />
            <div className="flex items-center gap-2">
              <button onClick={handleUnlock} className="btn btn-primary text-xs">
                Unlock
              </button>
              <button
                type="button"
                className="btn btn-ghost text-[10px] text-slate-500"
                onClick={clearVault}
              >
                Clear stored credentials
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <DashboardContent />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <VaultProvider>
        <SettingsProvider>
          <DashboardShell />
        </SettingsProvider>
      </VaultProvider>
    </ErrorBoundary>
  );
}
