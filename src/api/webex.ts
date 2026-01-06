// Webex API integration
// Docs: https://developer.webex.com/docs/api/v1/

const WEBEX_API_BASE = 'https://webexapis.com/v1';

export interface WebexRoom {
  id: string;
  title: string;
  type: 'direct' | 'group';
  lastActivity: string; // ISO 8601 timestamp
  creatorId: string;
  created: string; // ISO 8601 timestamp
}

export interface WebexMessage {
  id: string;
  roomId: string;
  personId: string;
  personEmail: string;
  text: string;
  created: string; // ISO 8601 timestamp
}

export interface WebexPerson {
  id: string;
  displayName: string;
  emails: string[];
  avatar?: string;
}

interface WebexRoomResponse {
  items: Array<{
    id: string;
    title: string;
    type: 'direct' | 'group';
    lastActivity: string;
    creatorId: string;
    created: string;
  }>;
}

interface WebexMessageResponse {
  items: Array<{
    id: string;
    roomId: string;
    personId: string;
    personEmail: string;
    text?: string;
    html?: string;
    created: string;
  }>;
}

function authHeaders(apiToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Fetch the most recent rooms (up to 10), sorted by last activity descending
 */

export async function fetchRecentRooms(apiToken: string): Promise<WebexRoom[]> {
  const params = new URLSearchParams({
    max: '20',
    sortBy: 'lastactivity',
  });

  const response = await fetch(`${WEBEX_API_BASE}/rooms?${params}`, {
    headers: authHeaders(apiToken),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid or expired Webex token. Please update it in Settings.');
    }
    throw new Error('Failed to fetch Webex rooms');
  }

  const data: WebexRoomResponse = await response.json();

  return data.items.map((room) => ({
    id: room.id,
    title: room.title,
    type: room.type,
    lastActivity: room.lastActivity,
    creatorId: room.creatorId,
    created: room.created,
  }));
}

/**
 * Fetch messages for a specific room (up to 10 most recent)
 */
export async function fetchRoomMessages(
  apiToken: string,
  roomId: string,
): Promise<WebexMessage[]> {
  const params = new URLSearchParams({
    roomId,
    max: '10',
  });

  const response = await fetch(`${WEBEX_API_BASE}/messages?${params}`, {
    headers: authHeaders(apiToken),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid or expired Webex token. Please update it in Settings.');
    }
    throw new Error('Failed to fetch Webex messages');
  }

  const data: WebexMessageResponse = await response.json();

  return data.items.map((msg) => ({
    id: msg.id,
    roomId: msg.roomId,
    personId: msg.personId,
    personEmail: msg.personEmail,
    text: msg.text || msg.html || '[No text content]',
    created: msg.created,
  }));
}

/**
 * Get the current authenticated user's info
 */
export async function fetchCurrentUser(apiToken: string): Promise<WebexPerson> {
  const response = await fetch(`${WEBEX_API_BASE}/people/me`, {
    headers: authHeaders(apiToken),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid or expired Webex token. Please update it in Settings.');
    }
    throw new Error('Failed to fetch Webex user info');
  }

  const data = await response.json();
  return {
    id: data.id,
    displayName: data.displayName,
    emails: data.emails || [],
    avatar: data.avatar,
  };
}

/**
 * Send a message to a room
 */
export async function sendMessage(
  apiToken: string,
  roomId: string,
  text: string,
): Promise<WebexMessage> {
  const response = await fetch(`${WEBEX_API_BASE}/messages`, {
    method: 'POST',
    headers: authHeaders(apiToken),
    body: JSON.stringify({
      roomId,
      text,
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid or expired Webex token. Please update it in Settings.');
    }
    throw new Error('Failed to send message');
  }

  const data = await response.json();
  return {
    id: data.id,
    roomId: data.roomId,
    personId: data.personId,
    personEmail: data.personEmail,
    text: data.text || '',
    created: data.created,
  };
}
