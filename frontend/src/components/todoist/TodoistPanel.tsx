import { useState, useEffect, useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import { TodoistTask, TaskCompletionEvent } from '../../types';
import { fetchTasks, completeTask, createTask, categorizeTasks } from '../../api/todoist';
import { TaskCompletionRepository } from '../../db';
import { getDateKey } from '../../utils/dateUtils';
import { useVault } from '../../state/VaultContext';

interface TodoistPanelProps {
  onTaskSelect: (task: TodoistTask) => void;
  selectedTaskId: string | null;
  onTaskCompleted: (event: TaskCompletionEvent) => void;
}

function TaskItem({
  task,
  isSelected,
  onSelect,
  onComplete,
}: {
  task: TodoistTask;
  isSelected: boolean;
  onSelect: () => void;
  onComplete: () => void;
}) {
  const priorityColors: Record<number, string> = {
    4: 'border-l-danger',
    3: 'border-l-warning',
    2: 'border-l-accent',
    1: 'border-l-slate-500',
  };

  return (
    <div
      className={`flex items-start gap-2 p-2 rounded border-l-2 ${
        priorityColors[task.priority] || 'border-l-slate-500'
      } ${isSelected ? 'bg-accent/20' : 'bg-slate-700/50 hover:bg-slate-700'}`}
    >
      <button
        onClick={onComplete}
        className="w-4 h-4 mt-0.5 rounded-full border-2 border-slate-400 hover:border-success hover:bg-success/20 flex-shrink-0"
      />
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onSelect}>
        <p className="text-sm text-slate-200 break-words">{task.content}</p>
        {task.due && (
          <p className="text-xs text-slate-500 mt-1">
            {task.due.string}
          </p>
        )}
      </div>
    </div>
  );
}

export function TodoistPanel({
  onTaskSelect,
  selectedTaskId,
  onTaskCompleted,
}: TodoistPanelProps) {
  const { getToken } = useVault();

  const [tasks, setTasks] = useState<TodoistTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskContent, setNewTaskContent] = useState('');

  const loadTasks = useCallback(async () => {
    const token = getToken('todoist');
    if (!token) {
      setError('Add your Todoist API token in Settings to load tasks');
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const fetched = await fetchTasks(token);
      setTasks(fetched);
    } catch (err) {
      setError('Failed to load tasks');
      console.error('Todoist loadTasks error:', err);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadTasks();
    // Refresh every 2 minutes
    const interval = setInterval(loadTasks, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadTasks]);

  const handleComplete = async (task: TodoistTask) => {
    try {
      const token = getToken('todoist');
      if (!token) {
        return;
      }

      await completeTask(token, task.id);
      
      // Log completion locally
      const event: TaskCompletionEvent = {
        id: uuid(),
        todoistTaskId: task.id,
        todoistTaskContent: task.content,
        completedAt: new Date().toISOString(),
        dateKey: getDateKey(),
      };
      await TaskCompletionRepository.create(event);
      onTaskCompleted(event);
      
      // Remove from local state
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskContent.trim()) return;
    
    try {
      const token = getToken('todoist');
      if (!token) {
        return;
      }

      const task = await createTask(token, newTaskContent, 'today');
      setTasks((prev) => [...prev, task]);
      setNewTaskContent('');
      setShowAddTask(false);
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleAddTaskKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTask();
    }
    if (e.key === 'Escape') {
      setShowAddTask(false);
      setNewTaskContent('');
    }
  };

  const { dueToday, overdue, nextAction } = categorizeTasks(tasks);

  if (loading && tasks.length === 0) {
    return (
      <div className="panel h-full flex items-center justify-center">
        <p className="text-slate-400">Loading tasks...</p>
      </div>
    );
  }

  if (error && tasks.length === 0) {
    return (
      <div className="panel h-full">
        <h2 className="panel-header">Tasks</h2>
        <div className="text-danger text-sm">{error}</div>
        <button onClick={loadTasks} className="btn btn-secondary mt-2">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="panel h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h2 className="panel-header mb-0">Tasks</h2>
        <div className="flex gap-2">
          <button onClick={loadTasks} className="btn btn-ghost text-xs">
            ↻
          </button>
          <button
            onClick={() => setShowAddTask(true)}
            className="btn btn-primary text-xs"
            data-add-task-btn
          >
            + Add
          </button>
        </div>
      </div>

      {/* Add task input */}
      {showAddTask && (
        <div className="mb-3">
          <input
            type="text"
            value={newTaskContent}
            onChange={(e) => setNewTaskContent(e.target.value)}
            onKeyDown={handleAddTaskKeyDown}
            placeholder="Task content..."
            className="input"
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button onClick={handleAddTask} className="btn btn-primary text-xs">
              Add
            </button>
            <button
              onClick={() => {
                setShowAddTask(false);
                setNewTaskContent('');
              }}
              className="btn btn-secondary text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-4">
        {/* Next Action */}
        {nextAction && (
          <div>
            <h3 className="text-xs text-accent uppercase tracking-wide mb-2 flex items-center gap-1">
              <span>→</span> Next Action
            </h3>
            <TaskItem
              task={nextAction}
              isSelected={selectedTaskId === nextAction.id}
              onSelect={() => onTaskSelect(nextAction)}
              onComplete={() => handleComplete(nextAction)}
            />
          </div>
        )}

        {/* Overdue */}
        {overdue.length > 0 && (
          <div>
            <h3 className="text-xs text-danger uppercase tracking-wide mb-2">
              Overdue ({overdue.length})
            </h3>
            <div className="space-y-2">
              {overdue.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  isSelected={selectedTaskId === task.id}
                  onSelect={() => onTaskSelect(task)}
                  onComplete={() => handleComplete(task)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Due Today */}
        {dueToday.length > 0 && (
          <div>
            <h3 className="text-xs text-warning uppercase tracking-wide mb-2">
              Due Today ({dueToday.length})
            </h3>
            <div className="space-y-2">
              {dueToday.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  isSelected={selectedTaskId === task.id}
                  onSelect={() => onTaskSelect(task)}
                  onComplete={() => handleComplete(task)}
                />
              ))}
            </div>
          </div>
        )}

        {/* No tasks state */}
        {tasks.length === 0 && (
          <p className="text-sm text-slate-500 italic text-center py-4">
            No tasks. Add one to get started!
          </p>
        )}
      </div>
    </div>
  );
}
