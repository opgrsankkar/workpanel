// Todoist task types
export interface TodoistTask {
  id: string;
  content: string;
  description: string;
  project_id: string;
  section_id: string | null;
  parent_id: string | null;
  order: number;
  priority: number;
  due: {
    date: string;
    string: string;
    datetime: string | null;
    timezone: string | null;
    is_recurring: boolean;
  } | null;
  url: string;
  comment_count: number;
  created_at: string;
  creator_id: string;
  assignee_id: string | null;
  assigner_id: string | null;
  labels: string[];
}

// Pomodoro session types
export type PomodoroStatus = 'running' | 'completed' | 'cancelled' | 'paused';

export interface PomodoroSession {
  id: string;
  todoistTaskId: string | null;
  todoistTaskContent: string | null;
  dateKey: string; // YYYY-MM-DD
  startTime: string; // ISO 8601
  endTime: string | null; // ISO 8601
  durationMinutes: number;
  plannedMinutes: number;
  status: PomodoroStatus;
  interruptCount: number;
}

// Interrupt log types
export interface InterruptLog {
  id: string;
  timestamp: string; // ISO 8601
  dateKey: string; // YYYY-MM-DD
  todoistTaskId: string | null;
  note: string | null;
}

// Task completion event (local tracking)
export interface TaskCompletionEvent {
  id: string;
  todoistTaskId: string;
  todoistTaskContent: string;
  completedAt: string; // ISO 8601
  dateKey: string; // YYYY-MM-DD
}

// Daily summary
export interface DailySummary {
  date: string;
  pomodorosCompleted: number;
  totalFocusMinutes: number;
  tasksCompleted: number;
  interruptionsLogged: number;
  completedTasks: TaskCompletionEvent[];
}

// Settings types
export interface TimezoneConfig {
  id: string;
  label: string;
  tz: string; // IANA timezone
}

export interface FeedVisibility {
  hackerNews: boolean;
  reuters: boolean;
}

export interface ShortcutConfig {
  startStopPomodoro: string;
  addTask: string;
  focusEditor: string;
  toggleFeeds: string;
  toggleFocusMode: string;
}

export type PanelId =
  | 'pomodoro'
  | 'intention'
  | 'clocks'
  | 'interrupts'
  | 'editor'
  | 'feeds'
  | 'tasks'
  | 'summary';

export interface PanelPosition {
  x: number;
  y: number;
}

export type PanelPositions = Partial<Record<PanelId, PanelPosition>>;

export interface PanelSize {
  width: number;
  height: number;
}

export type PanelSizes = Partial<Record<PanelId, PanelSize>>;

export interface DashboardSettings {
  timezones: TimezoneConfig[];
  feedVisibility: FeedVisibility;
  focusModeEnabled: boolean;
  shortcuts: ShortcutConfig;
  todayIntention: string;
   panelPositions?: PanelPositions;
  panelSizes?: PanelSizes;
}

// Feed item
export interface FeedItem {
  title: string;
  link: string;
  publishedAt: string;
  source: string;
}

// File System types for notes
export interface NoteFile {
  name: string;
  handle: FileSystemFileHandle;
  lastModified?: number;
}
