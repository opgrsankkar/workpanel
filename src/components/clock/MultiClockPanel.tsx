import { useEffect, useRef, useState } from 'react';
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

interface ClockDisplayProps {
  config: TimezoneConfig;
  now: Date;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onTimezoneChange: (tz: string) => void;
}

function ClockDisplay({
  config,
  now,
  isMenuOpen,
  onToggleMenu,
  onTimezoneChange,
}: ClockDisplayProps) {
  return (
    <div className="relative flex flex-col items-center text-center">
      <button
        type="button"
        onClick={onToggleMenu}
        className="mb-1 flex w-full items-center justify-center gap-1 text-center text-xs uppercase tracking-wide text-slate-500 hover:text-slate-300"
      >
        <span>{config.label}</span>
        <span className={`text-[10px] transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {isMenuOpen && (
        <div
          className="absolute left-1/2 top-full z-20 mt-1 w-44 -translate-x-1/2 overflow-hidden rounded border border-slate-600 bg-slate-800 shadow-lg"
          style={{ zIndex: 9999 }}
        >
          {COMMON_TIMEZONES.map((option) => {
            const isSelected = option.tz === config.tz;

            return (
              <button
                key={option.tz}
                type="button"
                onClick={() => onTimezoneChange(option.tz)}
                className={`w-full px-3 py-2 text-left ${
                  isSelected ? 'bg-slate-700' : 'bg-transparent hover:bg-slate-700/80'
                }`}
              >
                <div className="text-xs text-slate-200">{option.label}</div>
                <div className="mt-0.5 text-[11px] text-slate-500">{option.tz}</div>
              </button>
            );
          })}
        </div>
      )}

      <div className="text-2xl font-mono font-medium text-slate-200">
        {formatTimeOnly(now, config.tz)}
      </div>
      <div className="mt-1 text-xs text-slate-400">{formatDate(now, config.tz)}</div>
    </div>
  );
}

export function MultiClockPanel() {
  const { settings, updateTimezones } = useSettings();
  const [now, setNow] = useState(new Date());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const seconds = now.getSeconds().toString().padStart(2, '0');

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!openMenuId) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  const handleTimezoneChange = (index: number, tz: string) => {
    const selected = COMMON_TIMEZONES.find((timezone) => timezone.tz === tz);
    if (!selected) return;

    const nextTimezones = [...settings.timezones];
    nextTimezones[index] = {
      id: nextTimezones[index].id,
      label: selected.label,
      tz: selected.tz,
    };

    updateTimezones(nextTimezones);
    setOpenMenuId(null);
  };

  return (
    <div className="panel relative z-10 h-full overflow-visible" ref={panelRef}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="panel-header mb-0">World Clock :{seconds}</h2>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {settings.timezones.map((timezone, index) => (
          <ClockDisplay
            key={timezone.id}
            config={timezone}
            now={now}
            isMenuOpen={openMenuId === timezone.id}
            onToggleMenu={() =>
              setOpenMenuId((current) => (current === timezone.id ? null : timezone.id))
            }
            onTimezoneChange={(tz) => handleTimezoneChange(index, tz)}
          />
        ))}
      </div>
    </div>
  );
}
