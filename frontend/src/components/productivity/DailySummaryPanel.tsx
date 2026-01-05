import { DailySummary } from '../../types';
import { formatDuration } from '../../utils/dateUtils';

interface DailySummaryPanelProps {
  summary: DailySummary;
}

export function DailySummaryPanel({ summary }: DailySummaryPanelProps) {
  return (
    <div className="panel h-full flex flex-col">
      <h2 className="panel-header">Daily Summary</h2>

      <div className="flex-1 flex flex-col">
      <div className="grid grid-cols-2 gap-2">
        {/* Pomodoros */}
        <div className="bg-slate-700/50 rounded p-2 text-center">
          <div className="text-2xl font-bold text-accent">
            {summary.pomodorosCompleted}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Pomodoros
          </div>
        </div>

        {/* Focus time */}
        <div className="bg-slate-700/50 rounded p-2 text-center">
          <div className="text-2xl font-bold text-success">
            {formatDuration(summary.totalFocusMinutes)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Focus Time
          </div>
        </div>

        {/* Tasks completed */}
        <div className="bg-slate-700/50 rounded p-2 text-center">
          <div className="text-2xl font-bold text-warning">
            {summary.tasksCompleted}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Tasks Done
          </div>
        </div>

        {/* Interruptions */}
        <div className="bg-slate-700/50 rounded p-2 text-center">
          <div className="text-2xl font-bold text-danger">
            {summary.interruptionsLogged}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Interruptions
          </div>
        </div>
      </div>

      </div>
      {/* Completed tasks list */}
      {summary.completedTasks.length > 0 && (
        <div className="mt-2 flex-1 overflow-hidden">
          <h3 className="text-xs text-slate-500 uppercase tracking-wide mb-1">
            Completed Today
          </h3>
          <div className="space-y-1 overflow-y-auto" style={{maxHeight: 'calc(100% - 1.5rem)'}}>
            {summary.completedTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2 text-sm"
              >
                <span className="text-success">✓</span>
                <span className="text-slate-300 truncate">
                  {task.todoistTaskContent}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
