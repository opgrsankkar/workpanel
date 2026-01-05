import { useState, useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import { InterruptLog } from '../../types';
import { InterruptRepository } from '../../db';
import { getDateKey, formatRelativeTime } from '../../utils/dateUtils';

interface InterruptPanelProps {
  interrupts: InterruptLog[];
  onInterruptAdded: (log: InterruptLog) => void;
}

export function InterruptPanel({ interrupts, onInterruptAdded }: InterruptPanelProps) {
  const [note, setNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  const logInterrupt = useCallback(
    async (noteText: string | null) => {
      const log: InterruptLog = {
        id: uuid(),
        timestamp: new Date().toISOString(),
        dateKey: getDateKey(),
        todoistTaskId: null,
        note: noteText,
      };

      await InterruptRepository.create(log);
      onInterruptAdded(log);
      setNote('');
      setShowNoteInput(false);
    },
    [onInterruptAdded]
  );

  const handleQuickInterrupt = () => {
    logInterrupt(null);
  };

  const handleInterruptWithNote = () => {
    if (showNoteInput) {
      logInterrupt(note || null);
    } else {
      setShowNoteInput(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      logInterrupt(note || null);
    }
    if (e.key === 'Escape') {
      setShowNoteInput(false);
      setNote('');
    }
  };

  return (
    <div className="panel h-full flex flex-col">
      <h2 className="panel-header">Interrupt Log</h2>

      {/* Quick log buttons */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={handleQuickInterrupt}
          className="btn btn-danger flex-1"
        >
          I was interrupted
        </button>
        <button
          onClick={handleInterruptWithNote}
          className="btn btn-secondary"
        >
          + Note
        </button>
      </div>

      {/* Note input */}
      {showNoteInput && (
        <div className="mb-3">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What interrupted you?"
            className="input"
            autoFocus
          />
        </div>
      )}

      {/* Interrupt list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {interrupts.length === 0 ? (
          <p className="text-sm text-slate-500 italic">
            No interruptions logged today. Stay focused!
          </p>
        ) : (
          interrupts.map((log) => (
            <div
              key={log.id}
              className="bg-slate-700/50 rounded p-2 text-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-slate-400">
                  {formatRelativeTime(log.timestamp)}
                </span>
                <span className="text-danger text-xs">Interrupted</span>
              </div>
              {log.note && (
                <p className="text-slate-300 mt-1">{log.note}</p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      {interrupts.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-600 text-sm text-slate-400">
          Total today: <span className="text-white">{interrupts.length}</span> interruption{interrupts.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
