import { Router, Request, Response } from 'express';

const router = Router();

const TODOIST_API_BASE = 'https://api.todoist.com/rest/v2';

function getAuthHeader(): Record<string, string> {
  const apiKey = process.env.TODOIST_API_KEY;
  if (!apiKey) {
    throw new Error('TODOIST_API_KEY not configured');
  }
  return { Authorization: `Bearer ${apiKey}` };
}

// Fetch all active tasks
router.get('/tasks', async (_req: Request, res: Response) => {
  try {
    const response = await fetch(`${TODOIST_API_BASE}/tasks`, {
      headers: getAuthHeader(),
    });
    
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text });
    }
    
    const tasks = await response.json();
    res.json(tasks);
  } catch (error) {
    console.error('Todoist tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create a new task
router.post('/tasks', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${TODOIST_API_BASE}/tasks`, {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });
    
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text });
    }
    
    const task = await response.json();
    res.json(task);
  } catch (error) {
    console.error('Todoist create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Complete a task
router.post('/tasks/:id/close', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const response = await fetch(`${TODOIST_API_BASE}/tasks/${id}/close`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Todoist close task error:', error);
    res.status(500).json({ error: 'Failed to close task' });
  }
});

// Reopen a task
router.post('/tasks/:id/reopen', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const response = await fetch(`${TODOIST_API_BASE}/tasks/${id}/reopen`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Todoist reopen task error:', error);
    res.status(500).json({ error: 'Failed to reopen task' });
  }
});

// Delete a task
router.delete('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const response = await fetch(`${TODOIST_API_BASE}/tasks/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Todoist delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
