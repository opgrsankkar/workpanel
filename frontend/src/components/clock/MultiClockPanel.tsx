import { useState, useEffect } from 'react';
import { useSettings } from '../../state/SettingsContext';
import { formatDate, formatTimeOnly } from '../../utils/dateUtils';
import { TimezoneConfig } from '../../types';

const COMMON_TIMEZONES = [
  { label: 'Local', tz: Intl.DateTimeFormat().resolvedOptions().timeZone },
  { label: 'UTC', tz: 'UTC' },
  { label: 'New York', tz: 'America/New_York' },
  { label: 'Los Angeles', tz: 'America/Los_Angeles' },
  { label: 'London', tz: 'Europe/London' },
  { label: 'Paris', tz: 'Europe/Paris' },
  { label: 'Tokyo', tz: 'Asia/Tokyo' },
  { label: 'Sydney', tz: 'Australia/Sydney' },
  { label: 'Dubai', tz: 'Asia/Dubai' },
  { label: 'Singapore', tz: 'Asia/Singapore' },
];

function ClockDisplay({ config, now }: { config: TimezoneConfig; now: Date }) {
  return (
    <div className="text-center">
      <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
        {config.label}
      </div>
      <div className="text-2xl font-mono font-medium text-white">
        {formatTimeOnly(now, config.tz)}
      </div>
      <div className="text-xs text-slate-400 mt-1">
        {formatDate(now, config.tz)}
      </div>
    </div>
  );
}

export function MultiClockPanel() {
  const { settings, updateTimezones } = useSettings();
  const [now, setNow] = useState(new Date());
  const [isEditing, setIsEditing] = useState(false);
  const seconds = now.getSeconds().toString().padStart(2, '0');

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTimezoneChange = (index: number, tz: string) => {
    const selected = COMMON_TIMEZONES.find(t => t.tz === tz);
    if (!selected) return;

    const newTimezones = [...settings.timezones];
    newTimezones[index] = {
      id: newTimezones[index].id,
      label: selected.label,
      tz: selected.tz,
    };
    updateTimezones(newTimezones);
  };

  return (
    <div className="panel h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="panel-header mb-0">World Clock :{seconds}</h2>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="btn btn-ghost text-xs"
        >
          {isEditing ? 'Done' : 'Edit'}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {settings.timezones.map((tz, index) => (
          <div key={tz.id}>
            {isEditing ? (
              <div>
                <select
                  value={tz.tz}
                  onChange={(e) => handleTimezoneChange(index, e.target.value)}
                  className="input text-xs py-1"
                >
                  {COMMON_TIMEZONES.map((opt) => (
                    <option key={opt.tz} value={opt.tz}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <ClockDisplay config={tz} now={now} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
