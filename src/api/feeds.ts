import { FeedItem } from '../types';

const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0';
const HN_STORY_LIMIT = 10;

interface HackerNewsStory {
  id: number;
  title?: string;
  url?: string;
  time: number;
}

export async function fetchHackerNews(): Promise<FeedItem[]> {
  const topResponse = await fetch(`${HN_API_BASE}/topstories.json`);
  if (!topResponse.ok) {
    throw new Error('Failed to fetch Hacker News');
  }

  const topIds: number[] = await topResponse.json();
  const ids = topIds.slice(0, HN_STORY_LIMIT);

  const storyPromises = ids.map(async (id) => {
    const storyRes = await fetch(`${HN_API_BASE}/item/${id}.json`);
    if (!storyRes.ok) {
      throw new Error('Failed to fetch Hacker News story');
    }
    return storyRes.json() as Promise<HackerNewsStory>;
  });

  const stories = await Promise.all(storyPromises);

  const items: FeedItem[] = stories.map((story) => ({
    title: story.title || 'Untitled',
    link: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
    publishedAt: new Date(story.time * 1000).toISOString(),
    source: 'Hacker News',
  }));

  return items;
}

