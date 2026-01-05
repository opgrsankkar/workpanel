import { TodoistTask } from '../../types';

interface TaskSelectorModalProps {
  tasks: TodoistTask[];
  onSelect: (task: TodoistTask) => void;
  onClose: () => void;
}

export function TaskSelectorModal({
  tasks,
  onSelect,
  onClose,
}: TaskSelectorModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-panel-bg border border-panel-border rounded-lg p-4 w-full max-w-md max-h-[60vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white mb-4">
          Select Task for Pomodoro
        </h2>

        <div className="flex-1 overflow-y-auto space-y-2">
          {tasks.length === 0 ? (
            <p className="text-slate-400 text-center py-4">
              No tasks available
            </p>
          ) : (
            tasks.map((task) => (
              <button
                key={task.id}
                onClick={() => {
                  onSelect(task);
                  onClose();
                }}
                className="w-full text-left p-3 rounded bg-slate-700/50 hover:bg-slate-700 transition-colors"
              >
                <p className="text-sm text-slate-200">{task.content}</p>
                {task.due && (
                  <p className="text-xs text-slate-500 mt-1">
                    {task.due.string}
                  </p>
                )}
              </button>
            ))
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            onClick={() => {
              onSelect(null as unknown as TodoistTask);
              onClose();
            }}
            className="btn btn-ghost"
          >
            No Task
          </button>
        </div>
      </div>
    </div>
  );
}
