import { Router, Request, Response } from 'express';
import { XMLParser } from 'fast-xml-parser';

const router = Router();

interface FeedItem {
  title: string;
  link: string;
  publishedAt: string;
  source: string;
}

// Simple in-memory cache
const cache: Record<string, { data: unknown; timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
  const entry = cache[key];
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data as T;
  }
  return null;
}

function setCache(key: string, data: unknown): void {
  cache[key] = { data, timestamp: Date.now() };
}

// Hacker News top stories
router.get('/hackernews', async (_req: Request, res: Response) => {
  try {
    const cached = getCached<FeedItem[]>('hackernews');
    if (cached) {
      return res.json(cached);
    }

    // Get top story IDs
    const topStoriesRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
    const topStoryIds: number[] = await topStoriesRes.json();
    
    // Fetch first 10 stories
    const storyPromises = topStoryIds.slice(0, 10).map(async (id) => {
      const storyRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
      return storyRes.json();
    });
    
    const stories = await Promise.all(storyPromises);
    
    const items: FeedItem[] = stories.map((story) => ({
      title: story.title || 'Untitled',
      link: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
      publishedAt: new Date(story.time * 1000).toISOString(),
      source: 'Hacker News',
    }));
    
    setCache('hackernews', items);
    res.json(items);
  } catch (error) {
    console.error('Hacker News fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch Hacker News' });
  }
});

// Reuters RSS feed
router.get('/reuters', async (_req: Request, res: Response) => {
  try {
    const cached = getCached<FeedItem[]>('reuters');
    if (cached) {
      return res.json(cached);
    }

    // Reuters World News RSS
    const rssUrl = 'https://www.reutersagency.com/feed/?best-topics=world-news&post_type=best';
    const rssRes = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DashboardBot/1.0)',
      },
    });
    
    if (!rssRes.ok) {
      // Fallback: try alternative Reuters feed
      const altUrl = 'https://news.google.com/rss/search?q=reuters+world+news&hl=en-US&gl=US&ceid=US:en';
      const altRes = await fetch(altUrl);
      const altText = await altRes.text();
      const items = parseRssFeed(altText, 'Reuters/Google News');
      setCache('reuters', items);
      return res.json(items);
    }
    
    const rssText = await rssRes.text();
    const items = parseRssFeed(rssText, 'Reuters');
    
    setCache('reuters', items);
    res.json(items);
  } catch (error) {
    console.error('Reuters fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch Reuters' });
  }
});

function parseRssFeed(xml: string, source: string): FeedItem[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });
  
  try {
    const parsed = parser.parse(xml);
    const channel = parsed.rss?.channel || parsed.feed;
    
    if (!channel) {
      return [];
    }
    
    let items = channel.item || channel.entry || [];
    if (!Array.isArray(items)) {
      items = [items];
    }
    
    return items.slice(0, 10).map((item: Record<string, unknown>) => {
      // Normalize date to ISO string
      const rawDate = (item.pubDate as string) || (item.published as string) || '';
      let publishedAt: string;
      try {
        const date = rawDate ? new Date(rawDate) : new Date();
        publishedAt = isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
      } catch {
        publishedAt = new Date().toISOString();
      }
      
      return {
        title: (item.title as string) || 'Untitled',
        link: (item.link as string) || (item['@_href'] as string) || '',
        publishedAt,
        source,
      };
    });
  } catch (e) {
    console.error('RSS parse error:', e);
    return [];
  }
}

export default router;
