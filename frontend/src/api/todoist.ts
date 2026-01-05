import { TodoistTask } from '../types';

const API_BASE = '/api/todoist';

export async function fetchTasks(): Promise<TodoistTask[]> {
  const response = await fetch(`${API_BASE}/tasks`);
  if (!response.ok) {
    throw new Error('Failed to fetch tasks');
  }
  return response.json();
}

export async function createTask(content: string, dueString?: string): Promise<TodoistTask> {
  const response = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

export async function completeTask(taskId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/tasks/${taskId}/close`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to complete task');
  }
}

export async function reopenTask(taskId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/tasks/${taskId}/reopen`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to reopen task');
  }
}

export async function deleteTask(taskId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
    method: 'DELETE',
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
