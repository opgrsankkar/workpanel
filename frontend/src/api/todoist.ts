import { TodoistTask } from '../types';

const TODOIST_API_BASE = 'https://api.todoist.com/rest/v2';

function authHeaders(apiToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  };
}

export async function fetchTasks(apiToken: string): Promise<TodoistTask[]> {
  const response = await fetch(`${TODOIST_API_BASE}/tasks`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch tasks');
  }
  return response.json();
}

export async function createTask(apiToken: string, content: string, dueString?: string): Promise<TodoistTask> {
  const response = await fetch(`${TODOIST_API_BASE}/tasks`, {
    method: 'POST',
    headers: authHeaders(apiToken),
    body: JSON.stringify({
      content,
      due_string: dueString,
    }),
  });
  if (!response.ok) {
    throw new Error('Failed to create task');
  }
  return response.json();
}

export async function completeTask(apiToken: string, taskId: string): Promise<void> {
  const response = await fetch(`${TODOIST_API_BASE}/tasks/${taskId}/close`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  if (!response.ok) {
    throw new Error('Failed to complete task');
  }
}

export async function reopenTask(apiToken: string, taskId: string): Promise<void> {
  const response = await fetch(`${TODOIST_API_BASE}/tasks/${taskId}/reopen`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  if (!response.ok) {
    throw new Error('Failed to reopen task');
  }
}

export async function deleteTask(apiToken: string, taskId: string): Promise<void> {
  const response = await fetch(`${TODOIST_API_BASE}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  if (!response.ok) {
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
