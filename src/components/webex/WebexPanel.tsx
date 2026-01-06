import { useState, useEffect, useCallback } from 'react';
import { useVault } from '../../state/VaultContext';
import { useSettings } from '../../state/SettingsContext';
import {
  fetchRecentRooms,
  fetchRoomMessages,
  WebexRoom,
  WebexMessage,
} from '../../api/webex';
import { formatRelativeTime } from '../../utils/dateUtils';

type ViewMode = 'rooms' | 'messages';

export function WebexPanel() {
  const { getToken } = useVault();
  const { settings, updateWebexLastOpened, updateWebexHiddenRooms } = useSettings();

  // State
  const [view, setView] = useState<ViewMode>('rooms');
  const [rooms, setRooms] = useState<WebexRoom[]>([]);
  const [messages, setMessages] = useState<WebexMessage[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<WebexRoom | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsToRefresh, setSecondsToRefresh] = useState<number>(60);
  const [showHiddenRooms, setShowHiddenRooms] = useState(false);

  // Load rooms
  const loadRooms = useCallback(async () => {
    const token = getToken('webex');
    if (!token) {
      setError('Add your Webex API token in Settings to load messages.');
      setRooms([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const fetchedRooms = await fetchRecentRooms(token);
      setRooms(fetchedRooms);
    } catch (err) {
      console.error('Failed to load Webex rooms:', err);
      setError(err instanceof Error ? err.message : 'Failed to load rooms');
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  // Load messages for a room
  const loadMessages = useCallback(
    async (room: WebexRoom) => {
      const token = getToken('webex');
      if (!token) {
        setError('Add your Webex API token in Settings.');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const fetchedMessages = await fetchRoomMessages(token, room.id);
        // Reverse to show oldest first (chronological order)
        setMessages(fetchedMessages.reverse());
        setSelectedRoom(room);
        setView('messages');

        // Update last opened timestamp for unread tracking
        updateWebexLastOpened(room.id, new Date().toISOString());
      } catch (err) {
        console.error('Failed to load Webex messages:', err);
        setError(err instanceof Error ? err.message : 'Failed to load messages');
      } finally {
        setLoading(false);
      }
    },
    [getToken, updateWebexLastOpened],
  );

  // Initial load
  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // Auto-refresh timer for messages (60s)
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsToRefresh((s) => {
        if (s <= 1) {
          // time to refresh
          if (selectedRoom) {
            loadMessages(selectedRoom);
          } else {
            loadRooms();
          }
          return 60;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedRoom, loadMessages, loadRooms]);

  // Go back to rooms list
  const handleBack = useCallback(() => {
    setView('rooms');
    setSelectedRoom(null);
    setMessages([]);
    setError(null);
  }, []);

  // Check if a room has unread messages
  const hasUnread = useCallback(
    (room: WebexRoom): boolean => {
      const lastOpened = settings.webexLastOpened?.[room.id];
      if (!lastOpened) {
        // Never opened = unread
        return true;
      }
      // Compare room's last activity with our last opened timestamp
      return new Date(room.lastActivity) > new Date(lastOpened);
    },
    [settings.webexLastOpened],
  );

  // Get sender display name from email (extract name part before @)
  const getSenderName = (email: string): string => {
    const name = email.split('@')[0];
    // Convert first.last to First Last
    return name
      .split('.')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  // Render rooms list
  const renderRooms = () => {
    const hiddenIds = settings.webexHiddenRooms || [];
    const visibleRooms = rooms.filter((r) => !hiddenIds.includes(r.id));

    if (loading && rooms.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
          Loading rooms...
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <p className="text-xs text-danger mb-2 text-center">{error}</p>
          <button onClick={loadRooms} className="btn btn-secondary text-xs">
            Retry
          </button>
        </div>
      );
    }

    if (visibleRooms.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
          No rooms found
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto">
        {visibleRooms.map((room) => (
          <button
            key={room.id}
            onClick={() => loadMessages(room)}
            className="w-full text-left px-3 py-2 hover:bg-slate-700/50 transition-colors border-b border-slate-700/30"
          >
            <div className="flex items-center gap-2">
              {/* Unread indicator */}
              {hasUnread(room) && (
                <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-200 truncate">{room.title}</div>
                <div className="text-[10px] text-slate-500">
                  {formatRelativeTime(room.lastActivity)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-600 text-xs">›</span>
                <button
                  type="button"
                  className="text-[10px] text-slate-500 hover:text-slate-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    const currentHidden = settings.webexHiddenRooms || [];
                    if (!currentHidden.includes(room.id)) {
                      updateWebexHiddenRooms([...currentHidden, room.id]);
                    }
                  }}
                >
                  Hide
                </button>
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  };

  // Render messages
  const renderMessages = () => {
    if (loading && messages.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
          Loading messages...
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <p className="text-xs text-danger mb-2 text-center">{error}</p>
          <button
            onClick={() => selectedRoom && loadMessages(selectedRoom)}
            className="btn btn-secondary text-xs"
          >
            Retry
          </button>
        </div>
      );
    }

    if (messages.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
          No messages
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto space-y-2 p-2">
        {messages.map((msg) => (
          <div key={msg.id} className="bg-slate-700/30 rounded px-2 py-1.5">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs text-blue-400 font-medium">
                {getSenderName(msg.personEmail)}
              </span>
              <span className="text-[10px] text-slate-500">
                {formatRelativeTime(msg.created)}
              </span>
            </div>
            <p className="text-xs text-slate-300 break-words whitespace-pre-wrap">
              {msg.text}
            </p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="panel h-full flex flex-col">
      {/* Header */}
      <div className="panel-header flex items-center justify-between">
        {view === 'messages' && selectedRoom ? (
          <>
            <button
              onClick={handleBack}
              className="text-slate-400 hover:text-white mr-2 text-sm"
              aria-label="Back to rooms"
            >
              ←
            </button>
            <span className="flex-1 truncate text-sm">{selectedRoom.title}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (selectedRoom) loadMessages(selectedRoom);
                  setSecondsToRefresh(60);
                }}
                className="text-slate-400 hover:text-white text-sm"
                disabled={loading}
                aria-label="Refresh messages"
              >
                ↻
              </button>
              <span className="text-[11px] text-slate-500">{`${Math.floor(
                secondsToRefresh / 60,
              )}:${String(secondsToRefresh % 60).padStart(2, '0')}`}</span>
            </div>
          </>
        ) : (
          <>
            <span className="flex-1">Webex</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  loadRooms();
                  setSecondsToRefresh(60);
                }}
                className="text-slate-400 hover:text-white text-sm"
                disabled={loading}
                aria-label="Refresh rooms"
              >
                ↻
              </button>
              <span className="text-[11px] text-slate-500">{`${Math.floor(
                secondsToRefresh / 60,
              )}:${String(secondsToRefresh % 60).padStart(2, '0')}`}</span>
            </div>
          </>
        )}
      </div>

      {/* Small toolbar: unread count + mark-all-as-read */}
      <div className="px-3 py-2 border-b border-slate-700/20 flex items-center justify-between text-xs text-slate-400">
        <div className="flex flex-col gap-1">
          <span>
            {(() => {
              const hiddenIds = settings.webexHiddenRooms || [];
              const visibleRooms = rooms.filter((r) => !hiddenIds.includes(r.id));
              if (visibleRooms.length === 0) return 'No rooms';
              const unreadCount = visibleRooms.filter((r) => hasUnread(r)).length;
              return `${unreadCount} unread`;
            })()}
          </span>
          <button
            type="button"
            className="text-[11px] text-slate-500 hover:text-slate-300 text-left underline-offset-2 hover:underline"
            onClick={() => setShowHiddenRooms((v) => !v)}
          >
            {(() => {
              const hiddenIds = settings.webexHiddenRooms || [];
              const hiddenCount = rooms.filter((r) => hiddenIds.includes(r.id)).length;
              return `Hidden rooms (${hiddenCount})`;
            })()}
          </button>
        </div>
        <div>
          <button
            type="button"
            className="btn btn-ghost text-xs"
            onClick={() => {
              const now = new Date().toISOString();
              const hiddenIds = settings.webexHiddenRooms || [];
              rooms
                .filter((r) => !hiddenIds.includes(r.id))
                .forEach((r) => updateWebexLastOpened(r.id, now));
            }}
          >
            Mark all read
          </button>
        </div>
      </div>

      {/* Hidden rooms list */}
      {showHiddenRooms && (
        <div className="px-3 py-2 border-b border-slate-700/20 text-[11px] text-slate-400 space-y-1 max-h-32 overflow-y-auto">
          {(() => {
            const hiddenIds = settings.webexHiddenRooms || [];
            const hiddenRooms = rooms.filter((r) => hiddenIds.includes(r.id));
            if (hiddenRooms.length === 0) {
              return <div>No hidden rooms</div>;
            }
            return hiddenRooms.map((room) => (
              <div key={room.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{room.title}</span>
                <button
                  type="button"
                  className="text-[10px] text-slate-500 hover:text-slate-300"
                  onClick={() => {
                    const hidden = settings.webexHiddenRooms || [];
                    updateWebexHiddenRooms(hidden.filter((id) => id !== room.id));
                  }}
                >
                  Unhide
                </button>
              </div>
            ));
          })()}
        </div>
      )}

      {/* Content */}
      {view === 'rooms' ? renderRooms() : renderMessages()}
    </div>
  );
}
