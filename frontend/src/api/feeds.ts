import { FeedItem } from '../types';

const API_BASE = '/api/feeds';

export async function fetchHackerNews(): Promise<FeedItem[]> {
  const response = await fetch(`${API_BASE}/hackernews`);
  if (!response.ok) {
    throw new Error('Failed to fetch Hacker News');
  }
  return response.json();
}

export async function fetchReuters(): Promise<FeedItem[]> {
  const response = await fetch(`${API_BASE}/reuters`);
  if (!response.ok) {
    throw new Error('Failed to fetch Reuters');
  }
  return response.json();
}
