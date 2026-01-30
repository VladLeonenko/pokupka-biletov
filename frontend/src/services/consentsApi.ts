import type { Consent } from '@/types/consent';

const API_BASE = '';

function getToken(): string | null {
  return localStorage.getItem('auth.token');
}

// Генерация или получение session_id
function getSessionId(): string {
  let sessionId = localStorage.getItem('session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('session_id', sessionId);
  }
  return sessionId;
}

async function doFetch(url: string, options?: RequestInit) {
  const token = getToken();
  const sessionId = getSessionId();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'x-session-id': sessionId,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export interface SaveConsentInput {
  type: 'cookies' | 'privacy' | 'marketing' | 'analytics';
  necessary?: boolean;
  functional?: boolean;
  analytical?: boolean;
  marketing?: boolean;
  accepted: boolean;
}

export async function saveConsent(data: SaveConsentInput): Promise<Consent> {
  return doFetch('/api/consents', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getConsents(): Promise<Consent[]> {
  // Работает и для авторизованных, и для неавторизованных (по session_id)
  return doFetch('/api/consents');
}

export async function updateConsent(id: number, data: Partial<SaveConsentInput>): Promise<Consent> {
  return doFetch(`/api/consents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteConsent(id: number): Promise<void> {
  return doFetch(`/api/consents/${id}`, {
    method: 'DELETE',
  });
}

