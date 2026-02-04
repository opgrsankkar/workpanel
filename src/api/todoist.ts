import { TodoistTask } from '../types';

// Use Sync API which has explicit CORS support
// https://developer.todoist.com/api/v1/#tag/Authorization/Cross-Origin-Resource-Sharing
const TODOIST_SYNC_API = 'https://api.todoist.com/api/v1/sync';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Transform Sync API item format to REST API compatible format
function transformSyncItem(item: SyncItem): TodoistTask {
  return {
    id: item.id,
    content: item.content,
    description: item.description || '',
    project_id: item.project_id,
    section_id: item.section_id || null,
    parent_id: item.parent_id || null,
    order: item.child_order,
    priority: item.priority,
    due: item.due
      ? {
          date: item.due.date,
          string: item.due.string || item.due.date,
          datetime: item.due.datetime || null,
          timezone: item.due.timezone || null,
          is_recurring: item.due.is_recurring || false,
        }
      : null,
    url: `https://app.todoist.com/app/task/${item.id}`,
    comment_count: 0,
    created_at: item.added_at || '',
    creator_id: item.added_by_uid || '',
    assignee_id: item.responsible_uid || null,
    assigner_id: item.assigned_by_uid || null,
    labels: item.labels || [],
  };
}

interface SyncItem {
  id: string;
  content: string;
  description?: string;
  project_id: string;
  section_id?: string | null;
  parent_id?: string | null;
  child_order: number;
  priority: number;
  checked: boolean;
  due?: {
    date: string;
    string?: string;
    datetime?: string | null;
    timezone?: string | null;
    is_recurring?: boolean;
  } | null;
  added_at?: string;
  added_by_uid?: string;
  responsible_uid?: string | null;
  assigned_by_uid?: string | null;
  labels?: string[];
}

interface SyncResponse {
  items?: SyncItem[];
  sync_status?: Record<string, string | { error_code: number; error: string }>;
  temp_id_mapping?: Record<string, string>;
}

export async function fetchTasks(apiToken: string): Promise<TodoistTask[]> {
  // Use POST with x-www-form-urlencoded - this is a "simple" request that doesn't trigger CORS preflight
  const body = new URLSearchParams({
    sync_token: '*',
    resource_types: '["items"]',
  });

  const response = await fetch(TODOIST_SYNC_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch tasks');
  }
  
  const data: SyncResponse = await response.json();
  const items = data.items || [];
  
  // Filter out completed/deleted items and transform to TodoistTask format
  return items
    .filter((item) => !item.checked)
    .map(transformSyncItem);
}

export async function createTask(apiToken: string, content: string, dueString?: string): Promise<TodoistTask> {
  const tempId = generateUUID();
  const commandUuid = generateUUID();
  
  const commands = [
    {
      type: 'item_add',
      temp_id: tempId,
      uuid: commandUuid,
      args: {
        content,
        ...(dueString && { due: { string: dueString } }),
      },
    },
  ];

  const body = new URLSearchParams({
    commands: JSON.stringify(commands),
  });

  const response = await fetch(TODOIST_SYNC_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  
  if (!response.ok) {
    throw new Error('Failed to create task');
  }
  
  const data: SyncResponse = await response.json();
  
  // Check if command succeeded
  if (data.sync_status?.[commandUuid] !== 'ok') {
    throw new Error('Failed to create task');
  }
  
  // Get the real ID from temp_id_mapping
  const realId = data.temp_id_mapping?.[tempId] || tempId;
  
  // Return a minimal task object
  return {
    id: realId,
    content,
    description: '',
    project_id: '',
    section_id: null,
    parent_id: null,
    order: 0,
    priority: 1,
    due: dueString ? { date: '', string: dueString, datetime: null, timezone: null, is_recurring: false } : null,
    url: `https://app.todoist.com/app/task/${realId}`,
    comment_count: 0,
    created_at: new Date().toISOString(),
    creator_id: '',
    assignee_id: null,
    assigner_id: null,
    labels: [],
  };
}

export async function completeTask(apiToken: string, taskId: string): Promise<void> {
  const commandUuid = generateUUID();
  
  const commands = [
    {
      type: 'item_complete',
      uuid: commandUuid,
      args: {
        id: taskId,
      },
    },
  ];

  const body = new URLSearchParams({
    commands: JSON.stringify(commands),
  });

  const response = await fetch(TODOIST_SYNC_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  
  if (!response.ok) {
    throw new Error('Failed to complete task');
  }
  
  const data: SyncResponse = await response.json();
  
  if (data.sync_status?.[commandUuid] !== 'ok') {
    throw new Error('Failed to complete task');
  }
}

export async function reopenTask(apiToken: string, taskId: string): Promise<void> {
  const commandUuid = generateUUID();
  
  const commands = [
    {
      type: 'item_uncomplete',
      uuid: commandUuid,
      args: {
        id: taskId,
      },
    },
  ];

  const body = new URLSearchParams({
    commands: JSON.stringify(commands),
  });

  const response = await fetch(TODOIST_SYNC_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  
  if (!response.ok) {
    throw new Error('Failed to reopen task');
  }
  
  const data: SyncResponse = await response.json();
  
  if (data.sync_status?.[commandUuid] !== 'ok') {
    throw new Error('Failed to reopen task');
  }
}

export async function deleteTask(apiToken: string, taskId: string): Promise<void> {
  const commandUuid = generateUUID();
  
  const commands = [
    {
      type: 'item_delete',
      uuid: commandUuid,
      args: {
        id: taskId,
      },
    },
  ];

  const body = new URLSearchParams({
    commands: JSON.stringify(commands),
  });

  const response = await fetch(TODOIST_SYNC_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete task');
  }
  
  const data: SyncResponse = await response.json();
  
  if (data.sync_status?.[commandUuid] !== 'ok') {
    throw new Error('Failed to delete task');
  }
}

// Task filtering utilities
export function getDateKey(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

export function categorizeTasks(tasks: TodoistTask[]): {
  dueToday: TodoistTask[];
  overdue: TodoistTask[];
  nextAction: TodoistTask | null;
} {
  const today = getDateKey();
  
  const dueToday: TodoistTask[] = [];
  const overdue: TodoistTask[] = [];
  
  for (const task of tasks) {
    if (!task.due) continue;
    
    const dueDate = task.due.date;
    
    if (dueDate === today) {
      dueToday.push(task);
    } else if (dueDate < today) {
      overdue.push(task);
    }
  }
  
  // Sort by due date and priority for next action
  const sortedTasks = [...tasks]
    .filter(t => t.due)
    .sort((a, b) => {
      // First by due date
      const dateA = a.due!.date;
      const dateB = b.due!.date;
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      
      // Then by priority (higher priority = lower number, but Todoist uses 1-4 where 4 is highest)
      return b.priority - a.priority;
    });
  
  const nextAction = sortedTasks[0] || null;
  
  return { dueToday, overdue, nextAction };
}
