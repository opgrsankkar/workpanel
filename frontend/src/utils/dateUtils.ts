import { formatInTimeZone } from 'date-fns-tz';
import { format, formatDistanceToNow, isToday, parseISO } from 'date-fns';

export function getDateKey(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatTime(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, 'HH:mm:ss');
}

export function formatDate(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, 'EEE, MMM d');
}

export function formatTimeOnly(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, 'HH:mm');
}

export function formatRelativeTime(isoString: string): string {
  try {
    const date = parseISO(isoString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Unknown';
    }
    if (isToday(date)) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    return format(date, 'MMM d, HH:mm');
  } catch {
    return 'Unknown';
  }
}

export function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m`;
}

export function formatTimerDisplay(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
