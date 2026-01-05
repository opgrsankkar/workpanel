import { useState, useEffect } from 'react';
import { FeedItem } from '../../types';
import { fetchHackerNews, fetchReuters } from '../../api/feeds';
import { formatRelativeTime } from '../../utils/dateUtils';

interface FeedPanelProps {
  visible: boolean;
}

function FeedItemDisplay({ item }: { item: FeedItem }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-2 rounded hover:bg-slate-700/50 transition-colors"
    >
      <p className="text-sm text-slate-200 hover:text-white line-clamp-2">
        {item.title}
      </p>
      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
        <span>{item.source}</span>
        <span>·</span>
        <span>{formatRelativeTime(item.publishedAt)}</span>
      </div>
    </a>
  );
}

function FeedSection({
  title,
  items,
  loading,
  error,
  onRefresh,
}: {
  title: string;
  items: FeedItem[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs text-slate-500 uppercase tracking-wide">
          {title}
        </h3>
        <button
          onClick={onRefresh}
          className="text-xs text-slate-500 hover:text-white"
          disabled={loading}
        >
          {loading ? '...' : '↻'}
        </button>
      </div>
      
      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : items.length === 0 && !loading ? (
        <p className="text-sm text-slate-500 italic">No items</p>
      ) : (
        <div className="space-y-1">
          {items.map((item, idx) => (
            <FeedItemDisplay key={`${item.link}-${idx}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

export function FeedPanel({ visible }: FeedPanelProps) {
  const [hnItems, setHnItems] = useState<FeedItem[]>([]);
  const [reutersItems, setReutersItems] = useState<FeedItem[]>([]);
  const [hnLoading, setHnLoading] = useState(true);
  const [reutersLoading, setReutersLoading] = useState(true);
  const [hnError, setHnError] = useState<string | null>(null);
  const [reutersError, setReutersError] = useState<string | null>(null);

  const loadHackerNews = async () => {
    try {
      setHnLoading(true);
      setHnError(null);
      const items = await fetchHackerNews();
      setHnItems(items);
    } catch (err) {
      setHnError('Failed to load');
    } finally {
      setHnLoading(false);
    }
  };

  const loadReuters = async () => {
    try {
      setReutersLoading(true);
      setReutersError(null);
      const items = await fetchReuters();
      setReutersItems(items);
    } catch (err) {
      setReutersError('Failed to load');
    } finally {
      setReutersLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadHackerNews();
      loadReuters();
    }
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <div className="panel h-full overflow-y-auto">
      <h2 className="panel-header">News Feed</h2>

      <FeedSection
        title="Hacker News"
        items={hnItems}
        loading={hnLoading}
        error={hnError}
        onRefresh={loadHackerNews}
      />

      <FeedSection
        title="Reuters"
        items={reutersItems}
        loading={reutersLoading}
        error={reutersError}
        onRefresh={loadReuters}
      />
    </div>
  );
}
