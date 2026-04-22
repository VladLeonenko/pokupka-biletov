import { getApiBase } from '@/utils/apiBase';
import Cookies from 'js-cookie';
import type { TicketsVitrineContent } from '@/types/ticketsVitrine';

const API_BASE = getApiBase();

function authHeaders(): HeadersInit {
  const token = Cookies.get('auth_token') || null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export type TicketsVitrineResponse = {
  content: TicketsVitrineContent;
  updated_at: string | null;
};

async function handle<T>(res: Response): Promise<T> {
  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      if (!res.ok) throw new Error(`Ошибка ${res.status}`);
      throw new Error('Некорректный JSON в ответе');
    }
  }
  if (!res.ok) {
    const msg =
      parsed && typeof parsed === 'object' && parsed !== null && 'error' in parsed
        ? String((parsed as { error?: string }).error)
        : `Ошибка ${res.status}`;
    throw new Error(msg);
  }
  return parsed as T;
}

export async function fetchPublicTicketsVitrine(): Promise<TicketsVitrineResponse> {
  const res = await fetch(`${API_BASE}/api/public/tickets-vitrine`);
  return handle<TicketsVitrineResponse>(res);
}

export async function fetchAdminTicketsVitrine(): Promise<TicketsVitrineResponse> {
  const res = await fetch(`${API_BASE}/api/admin/tickets-vitrine`, { headers: authHeaders() });
  return handle<TicketsVitrineResponse>(res);
}

export async function putAdminTicketsVitrine(content: TicketsVitrineContent): Promise<TicketsVitrineResponse> {
  const res = await fetch(`${API_BASE}/api/admin/tickets-vitrine`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ content }),
  });
  return handle<TicketsVitrineResponse>(res);
}
