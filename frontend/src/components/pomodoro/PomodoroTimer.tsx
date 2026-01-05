import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import { PomodoroSession, TodoistTask } from '../../types';
import { PomodoroRepository } from '../../db';
import { getDateKey, formatTimerDisplay } from '../../utils/dateUtils';

interface PomodoroTimerProps {
  attachedTask: TodoistTask | null;
  onTaskAttach: () => void;
  onComplete: (session: PomodoroSession) => void;
  onInterrupt: () => void;
}

const DEFAULT_WORK_MINUTES = 25;
const DEFAULT_BREAK_MINUTES = 5;

export function PomodoroTimer({
  attachedTask,
  onTaskAttach,
  onComplete,
  onInterrupt,
}: PomodoroTimerProps) {
  const [session, setSession] = useState<PomodoroSession | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(DEFAULT_WORK_MINUTES * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [workMinutes, setWorkMinutes] = useState(DEFAULT_WORK_MINUTES);
  const [breakMinutes, setBreakMinutes] = useState(DEFAULT_BREAK_MINUTES);
  const [focusMode, setFocusMode] = useState<'work' | 'break'>('work');
  const intervalRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load any running session on mount
  useEffect(() => {
    const loadRunningSession = async () => {
      const running = await PomodoroRepository.getRunning();
      if (running) {
        setSession(running);
        // Calculate remaining time
        const elapsed = Math.floor(
          (Date.now() - new Date(running.startTime).getTime()) / 1000
        );
        const remaining = running.plannedMinutes * 60 - elapsed;
        if (remaining > 0) {
          setSecondsRemaining(remaining);
          setIsRunning(true);
        } else {
          // Session expired while away
          await completeSession(running);
        }
      }
    };
    loadRunningSession();
  }, []);

  const completeSession = async (sess: PomodoroSession) => {
    const completed: PomodoroSession = {
      ...sess,
      status: 'completed',
      endTime: new Date().toISOString(),
      durationMinutes: sess.plannedMinutes,
    };
    await PomodoroRepository.update(completed);
    setSession(null);
    setIsRunning(false);
    onComplete(completed);
    
    // Play completion sound
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
    
    // Start break
    setIsBreak(true);
    setSecondsRemaining(breakMinutes * 60);
  };

  useEffect(() => {
    if (isRunning && secondsRemaining > 0) {
      intervalRef.current = window.setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            if (session && !isBreak) {
              completeSession(session);
            } else if (isBreak) {
              setIsBreak(false);
              setSecondsRemaining(workMinutes * 60);
              setIsRunning(false);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, session, isBreak, workMinutes]);

  const startPomodoro = useCallback(async () => {
    const newSession: PomodoroSession = {
      id: uuid(),
      todoistTaskId: attachedTask?.id || null,
      todoistTaskContent: attachedTask?.content || null,
      dateKey: getDateKey(),
      startTime: new Date().toISOString(),
      endTime: null,
      durationMinutes: 0,
      plannedMinutes: workMinutes,
      status: 'running',
      interruptCount: 0,
    };

    await PomodoroRepository.create(newSession);
    setSession(newSession);
    setSecondsRemaining(workMinutes * 60);
    setIsRunning(true);
    setIsBreak(false);
  }, [attachedTask, workMinutes]);

  const stopPomodoro = useCallback(async () => {
    if (session) {
      const elapsed = Math.floor(
        (Date.now() - new Date(session.startTime).getTime()) / 1000 / 60
      );
      const cancelled: PomodoroSession = {
        ...session,
        status: 'cancelled',
        endTime: new Date().toISOString(),
        durationMinutes: elapsed,
      };
      await PomodoroRepository.update(cancelled);
    }
    setSession(null);
    setIsRunning(false);
    setSecondsRemaining(workMinutes * 60);
    setIsBreak(false);
  }, [session, workMinutes]);

  const toggleTimer = useCallback(() => {
    if (isRunning) {
      stopPomodoro();
    } else {
      startPomodoro();
    }
  }, [isRunning, startPomodoro, stopPomodoro]);

  const handleInterrupt = useCallback(async () => {
    if (session) {
      const updated: PomodoroSession = {
        ...session,
        interruptCount: session.interruptCount + 1,
      };
      await PomodoroRepository.update(updated);
      setSession(updated);
    }
    onInterrupt();
  }, [session, onInterrupt]);

  const progress = isBreak
    ? ((breakMinutes * 60 - secondsRemaining) / (breakMinutes * 60)) * 100
    : ((workMinutes * 60 - secondsRemaining) / (workMinutes * 60)) * 100;

  return (
    <div className="panel h-full flex flex-col">
      <h2 className="panel-header">Pomodoro Timer</h2>

      <div className="flex-1 flex flex-col justify-center">
      {/* Timer display */}
      <div className="relative flex items-center justify-center mb-4">
        <div
          className={`text-5xl font-mono font-bold ${
            isBreak ? 'text-success' : isRunning ? 'text-accent' : 'text-white'
          }`}
        >
          {formatTimerDisplay(secondsRemaining)}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-700 rounded-full mb-4 overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${
            isBreak ? 'bg-success' : 'bg-accent'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Status */}
      <div className="text-center text-sm text-slate-400 mb-4">
        {isBreak ? (
          <span className="text-success">Break time!</span>
        ) : isRunning ? (
          <span>
            Focus session
            {session?.interruptCount ? ` (${session.interruptCount} interrupts)` : ''}
          </span>
        ) : (
          <span>Ready to focus</span>
        )}
      </div>

      {/* Attached task */}
      {attachedTask && (
        <div className="bg-slate-700/50 rounded p-2 mb-4 text-sm">
          <span className="text-slate-400">Working on: </span>
          <span className="text-white">{attachedTask.content}</span>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={toggleTimer}
          className={`btn flex-1 ${isRunning ? 'btn-danger' : 'btn-primary'}`}
          data-pomodoro-toggle
        >
          {isRunning ? 'Stop' : 'Start'}
        </button>
        
        {!isRunning && !isBreak && (
          <button onClick={onTaskAttach} className="btn btn-secondary">
            {attachedTask ? 'Change Task' : 'Attach Task'}
          </button>
        )}
        
        {isRunning && !isBreak && (
          <button onClick={handleInterrupt} className="btn btn-secondary">
            Interrupted
          </button>
        )}
      </div>

      {/* Mode selector */}
      {!isRunning && (
        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setFocusMode('work');
                setIsBreak(false);
                setSecondsRemaining(workMinutes * 60);
              }}
              className={`flex-1 px-3 py-2 rounded text-sm font-medium ${
                focusMode === 'work'
                  ? 'bg-accent text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Work Focus
            </button>
            <button
              onClick={() => {
                setFocusMode('break');
                setIsBreak(true);
                setSecondsRemaining(breakMinutes * 60);
              }}
              className={`flex-1 px-3 py-2 rounded text-sm font-medium ${
                focusMode === 'break'
                  ? 'bg-success text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Break Time
            </button>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">
              {focusMode === 'work' ? 'Work:' : 'Break:'}
            </span>
            {(focusMode === 'work' ? [15, 25, 30, 45] : [5, 10, 15, 20]).map((mins) => (
              <button
                key={mins}
                onClick={() => {
                  if (focusMode === 'work') {
                    setWorkMinutes(mins);
                  } else {
                    setBreakMinutes(mins);
                  }
                  setSecondsRemaining(mins * 60);
                }}
                className={`px-2 py-1 rounded ${
                  (focusMode === 'work' ? workMinutes : breakMinutes) === mins
                    ? 'bg-accent text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>
      )}
      </div>

      {/* Hidden audio for completion sound */}
      <audio
        ref={audioRef}
        src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp2YkYyCeHJxdX+Lmqiuq6OYi31vZWRodYOUnKWnpZ+Wjoh/dnBubXR+iZOanZ2amJSPiYR/e3l4eXx/hIiLjo+OjYuJhoOAf359fX1+f4GDhYaGhoWEg4GAfn18fHt7e3x9f4CDhIWFhISDgYB/fn18e3t7fH1+f4CDhYaGhoWDgoB/fn18e3t7fHx9fn+Ag4SFhYWEg4KAf35+fXt7e3t8fH5/gIKDhIWEg4OCgH9+fXx8e3t7fHx9fn+Ag4OEhISDgYCAf35+fXx8fHx8fX5/gIGCg4SEg4KBgH9+fX19fHx8fHx9fn+AgYKDg4ODgoGAf35+fX19fXx8fH1+f4CBgoODg4KBgIB/fn5+fX19fX19fn5/gIGCgoOCgoGAf39+fn59fX19fX5+f4CAgYKCgoKBgIB/f35+fn19fX1+fn5/gICBgoKCgYGAf39/fn5+fn5+fn5+f3+AgIGBgoKBgYCAf39/fn5+fn5+fn5/f4CAgYGBgYGAgIB/f39+fn5+fn5+fn9/gICAgYGBgYCAgH9/f39+fn5+fn5/f39/gICAgYGBgICAf39/f35+fn5+fn9/f4CAgICBgYGAgIB/f39/f35+fn5+f39/gICAgIGBgICAf39/f39+fn5+fn9/f4CAgICAgYCAgIB/f39/f35+fn5/f3+AgICAgICAgICAf39/f39/fn5+f39/f4CAgICAgICAgH9/f39/f39+fn9/f3+AgICAgICAgIB/f39/f39/f39/f39/gICAgICAgICAf39/f39/f39/f39/f4CAgICAgICAgH9/f39/f39/f39/f3+AgICAgICAgIB/f39/f39/f39/f39/gICAgICAgIB/f39/f39/f39/f39/gICAgICAgICAf39/f39/f39/f39/f4CAgICAgICAgH9/f39/f39/f39/f3+AgICAgICAgIB/f39/f39/f39/f39/gICAgICAgICAf39/f39/f39/f39/f4CAgICAgICAf39/f39/f39/f39/f4CAgICAgICAgH9/f39/f39/f39/f3+AgICAgICAgIB/f39/f39/f39/f39/gICAgICAgICAf39/f39/f39/f39/f4CAgICAgICA"
      />
    </div>
  );
}
