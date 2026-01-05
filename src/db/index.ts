import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { PomodoroSession, InterruptLog, TaskCompletionEvent } from '../types';

interface DashboardDB extends DBSchema {
  pomodoroSessions: {
    key: string;
    value: PomodoroSession;
    indexes: { 'by-date': string; 'by-task': string };
  };
  interruptions: {
    key: string;
    value: InterruptLog;
    indexes: { 'by-date': string };
  };
  taskCompletions: {
    key: string;
    value: TaskCompletionEvent;
    indexes: { 'by-date': string; 'by-task': string };
  };
}

const DB_NAME = 'dashboard-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<DashboardDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<DashboardDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<DashboardDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Pomodoro sessions store
      if (!db.objectStoreNames.contains('pomodoroSessions')) {
        const pomodoroStore = db.createObjectStore('pomodoroSessions', { keyPath: 'id' });
        pomodoroStore.createIndex('by-date', 'dateKey');
        pomodoroStore.createIndex('by-task', 'todoistTaskId');
      }

      // Interruptions store
      if (!db.objectStoreNames.contains('interruptions')) {
        const interruptStore = db.createObjectStore('interruptions', { keyPath: 'id' });
        interruptStore.createIndex('by-date', 'dateKey');
      }

      // Task completions store
      if (!db.objectStoreNames.contains('taskCompletions')) {
        const completionStore = db.createObjectStore('taskCompletions', { keyPath: 'id' });
        completionStore.createIndex('by-date', 'dateKey');
        completionStore.createIndex('by-task', 'todoistTaskId');
      }
    },
  });

  return dbInstance;
}

// Pomodoro repository
export const PomodoroRepository = {
  async create(session: PomodoroSession): Promise<void> {
    const db = await getDB();
    await db.put('pomodoroSessions', session);
  },

  async update(session: PomodoroSession): Promise<void> {
    const db = await getDB();
    await db.put('pomodoroSessions', session);
  },

  async getById(id: string): Promise<PomodoroSession | undefined> {
    const db = await getDB();
    return db.get('pomodoroSessions', id);
  },

  async getByDate(dateKey: string): Promise<PomodoroSession[]> {
    const db = await getDB();
    return db.getAllFromIndex('pomodoroSessions', 'by-date', dateKey);
  },

  async getRunning(): Promise<PomodoroSession | undefined> {
    const db = await getDB();
    const all = await db.getAll('pomodoroSessions');
    return all.find(s => s.status === 'running');
  },

  async getByTaskId(taskId: string): Promise<PomodoroSession[]> {
    const db = await getDB();
    return db.getAllFromIndex('pomodoroSessions', 'by-task', taskId);
  },
};

// Interruption repository
export const InterruptRepository = {
  async create(log: InterruptLog): Promise<void> {
    const db = await getDB();
    await db.put('interruptions', log);
  },

  async getByDate(dateKey: string): Promise<InterruptLog[]> {
    const db = await getDB();
    return db.getAllFromIndex('interruptions', 'by-date', dateKey);
  },

  async getAll(): Promise<InterruptLog[]> {
    const db = await getDB();
    return db.getAll('interruptions');
  },
};

// Task completion repository
export const TaskCompletionRepository = {
  async create(event: TaskCompletionEvent): Promise<void> {
    const db = await getDB();
    await db.put('taskCompletions', event);
  },

  async getByDate(dateKey: string): Promise<TaskCompletionEvent[]> {
    const db = await getDB();
    return db.getAllFromIndex('taskCompletions', 'by-date', dateKey);
  },

  async getByTaskId(taskId: string): Promise<TaskCompletionEvent[]> {
    const db = await getDB();
    return db.getAllFromIndex('taskCompletions', 'by-task', taskId);
  },
};
