import { getApiBase } from '@/utils/apiBase';
import Cookies from 'js-cookie';

const API_BASE = getApiBase();

function authHeaders(): HeadersInit {
  const token = Cookies.get('auth_token') || null;
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface Admin {
  id: number;
  email: string;
  name: string | null;
  created_at: string;
}

export async function listAdmins(): Promise<Admin[]> {
  const res = await fetch(`${API_BASE}/api/admins`, { headers: authHeaders() });
  if (!res.ok) throw new Error(res.status === 403 ? 'Доступ запрещён' : 'Ошибка загрузки');
  return res.json();
}

export async function addAdmin(data: { email: string; password: string; name?: string }): Promise<Admin> {
  const res = await fetch(`${API_BASE}/api/admins`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  const err = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(err.error || 'Ошибка добавления');
  return res.json();
}

export async function removeAdmin(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admins/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const err = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(err.error || 'Ошибка удаления');
}

export async function resetAdminPassword(id: number, password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admins/${id}/reset-password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ password }),
  });
  const err = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(err.error || 'Ошибка сброса пароля');
}
