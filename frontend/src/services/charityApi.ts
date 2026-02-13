import Cookies from 'js-cookie';
import { getApiBase } from '@/utils/apiBase';

export interface CharityAllocation {
  fund_id: string;
  fund_name: string;
  percent: number;
}

async function doFetch(input: string, init?: RequestInit): Promise<Response> {
  const token = Cookies.get('auth_token');
  return fetch(input, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
  });
}

export async function getCharityPreferences(): Promise<{ allocations: CharityAllocation[] }> {
  const res = await doFetch(`${getApiBase()}/api/charity-preferences`);
  if (!res.ok) throw new Error('Не удалось загрузить пожелания по фонду');
  return res.json();
}

export async function putCharityPreferences(allocations: CharityAllocation[]): Promise<{ allocations: CharityAllocation[] }> {
  const res = await doFetch(`${getApiBase()}/api/charity-preferences`, {
    method: 'PUT',
    body: JSON.stringify({ allocations }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Не удалось сохранить');
  }
  return res.json();
}
