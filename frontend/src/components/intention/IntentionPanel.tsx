import { useState, useEffect, useRef } from 'react';
import { useSettings } from '../../state/SettingsContext';

export function IntentionPanel() {
  const { settings, updateTodayIntention } = useSettings();
  const [intention, setIntention] = useState(settings.todayIntention);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setIntention(settings.todayIntention);
  }, [settings.todayIntention]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    updateTodayIntention(intention);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      setIntention(settings.todayIntention);
      setIsEditing(false);
    }
  };

  return (
    <div className="panel h-full flex flex-col">
      <h2 className="panel-header">Today's Intention</h2>
      
      {isEditing ? (
        <div className="flex-1 flex flex-col">
          <textarea
            ref={inputRef}
            value={intention}
            onChange={(e) => setIntention(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="input flex-1 resize-none text-xl font-medium"
            placeholder="What's your focus for today?"
          />
        </div>
      ) : (
        <div
          onClick={() => setIsEditing(true)}
          className="flex-1 flex items-center cursor-pointer hover:bg-slate-700/50 rounded p-2 transition-colors"
        >
          {intention ? (
            <p className="text-xl font-medium text-white leading-relaxed">
              {intention}
            </p>
          ) : (
            <p className="text-xl text-slate-500 italic">
              Click to set your intention for today...
            </p>
          )}
        </div>
      )}
    </div>
  );
}
