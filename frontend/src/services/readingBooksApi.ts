import { getApiBase } from '@/utils/apiBase';

const API_BASE: string = getApiBase();

import { getAuthToken } from '@/utils/authStorage';
function getToken(): string | null {
  try {
    return getAuthToken();
  } catch {
    return null;
  }
}

function authHeaders(init?: HeadersInit): HeadersInit {
  const token = getToken();
  return {
    ...(init || {}),
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function doFetch(input: string, init?: RequestInit): Promise<Response> {
  const headers = authHeaders(init?.headers as any);
  return await fetch(input, { ...(init || {}), headers });
}

export interface ReadingBook {
  id: number;
  user_id: number;
  book_title: string;
  book_author?: string;
  book_genre?: string;
  is_read: boolean;
  rating?: number;
  read_date?: string;
  notes?: string;
  replaced: boolean;
  replaced_with?: string;
  created_at: string;
  updated_at: string;
}

export async function listReadingBooks(): Promise<ReadingBook[]> {
  const res = await doFetch(`${API_BASE}/api/reading-books`);
  if (!res.ok) throw new Error('Failed to fetch reading books');
  return res.json();
}

export async function getReadBooks(): Promise<ReadingBook[]> {
  const res = await doFetch(`${API_BASE}/api/reading-books/read`);
  if (!res.ok) throw new Error('Failed to fetch read books');
  return res.json();
}

export async function saveReadingBook(book: {
  book_title: string;
  book_author?: string;
  book_genre?: string;
  is_read?: boolean;
  rating?: number;
  read_date?: string;
  notes?: string;
}): Promise<ReadingBook> {
  const res = await doFetch(`${API_BASE}/api/reading-books`, {
    method: 'POST',
    body: JSON.stringify(book),
  });
  if (!res.ok) throw new Error('Failed to save reading book');
  return res.json();
}

export async function updateReadingBook(id: number, updates: {
  is_read?: boolean;
  rating?: number;
  read_date?: string;
  notes?: string;
  replaced?: boolean;
  replaced_with?: string;
}): Promise<ReadingBook> {
  const res = await doFetch(`${API_BASE}/api/reading-books/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update reading book');
  return res.json();
}

export async function markBookAsRead(book: {
  book_title: string;
  book_author?: string;
  rating?: number;
  read_date?: string;
}): Promise<ReadingBook> {
  const res = await doFetch(`${API_BASE}/api/reading-books/mark-read`, {
    method: 'POST',
    body: JSON.stringify(book),
  });
  if (!res.ok) throw new Error('Failed to mark book as read');
  return res.json();
}

export async function replaceBooks(books: Array<{ book_title: string; book_author?: string }>, replacement_books: Array<{ title: string; author?: string; genre?: string }>): Promise<{ replaced: ReadingBook[]; added: ReadingBook[] }> {
  const res = await doFetch(`${API_BASE}/api/reading-books/replace`, {
    method: 'POST',
    body: JSON.stringify({ books, replacement_books }),
  });
  if (!res.ok) throw new Error('Failed to replace books');
  return res.json();
}


