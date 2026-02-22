import type { Task } from '@/types/cms';

export type AiTeamPlanCode = 'JUNIOR' | 'PRO' | 'ENTERPRISE';

export interface AiTeamPlanLimits {
  code: AiTeamPlanCode;
  name: string;
  maxTasksPerWeek: number;
  maxTasksPerDay: number | null;
  maxRevisionsPerTask: number | null;
}

export interface AiTeamSubscription {
  id: number;
  planCode: AiTeamPlanCode;
  status: 'active' | 'paused' | 'cancelled';
  primaryTaskType?: string | null;
  validFrom?: string;
  validTo?: string | null;
}

export interface AiTeamUsage {
  tasksThisWeek: number;
  tasksToday: number;
}

export interface AiTeamOverloadState {
  weekLimitReached: boolean;
  dayLimitReached: boolean;
  weekUsagePercent: number | null;
}

export interface AiTeamOverview {
  subscription: AiTeamSubscription;
  planLimits: AiTeamPlanLimits;
  usage: AiTeamUsage;
  overload: AiTeamOverloadState;
}

export type AiTeamTaskStatus = Task['status'] | 'awaiting_client' | 'revision';

export interface AiTeamTask {
  id: number;
  title: string;
  description: string;
  status: AiTeamTaskStatus;
  priority: Task['priority'];
  dueDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  taskType: 'CONTENT' | 'ANALYTICS' | 'SMM' | 'ADS';
  revisionsCount: number;
  awaitingSince?: string | null;
  rating?: number | null;
}

export interface AiTeamTasksResponse {
  tasks: AiTeamTask[];
}

import { getApiBase } from '@/utils/apiBase';

const API_BASE: string = getApiBase();

import { getAuthToken } from '@/utils/authStorage';
function getToken(): string | null {
  return getAuthToken();
}

function authHeaders(init?: HeadersInit): HeadersInit {
  const token = getToken();
  return {
    ...(init || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function doFetch(input: string, init?: RequestInit): Promise<Response> {
  const headers = authHeaders(init?.headers as any);
  return await fetch(input, { ...(init || {}), headers });
}

export async function getAiTeamOverview(): Promise<AiTeamOverview | null> {
  const res = await doFetch(`${API_BASE}/api/ai-team/me/overview`);
  if (res.status === 404) {
    // Нет активной подписки
    return null;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Не удалось загрузить данные AI Team');
  }
  return res.json();
}

export async function listAiTeamTasks(status?: AiTeamTaskStatus): Promise<AiTeamTask[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  const res = await doFetch(`${API_BASE}/api/ai-team/me/tasks?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Не удалось загрузить задачи AI Team');
  }
  const data: AiTeamTasksResponse = await res.json();
  return data.tasks || [];
}

export async function createAiTeamTask(payload: {
  title: string;
  description?: string;
  taskType: 'CONTENT' | 'ANALYTICS' | 'SMM' | 'ADS';
  priority?: Task['priority'];
}): Promise<AiTeamTask> {
  const res = await doFetch(`${API_BASE}/api/ai-team/me/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Не удалось создать задачу AI Team');
  }
  return (data.task || data) as AiTeamTask;
}

export async function requestAiTaskRevision(taskId: number): Promise<void> {
  const res = await doFetch(`${API_BASE}/api/ai-team/me/tasks/${taskId}/revision`, {
    method: 'POST',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Не удалось запросить правку');
  }
}

export async function approveAiTask(taskId: number): Promise<void> {
  const res = await doFetch(`${API_BASE}/api/ai-team/me/tasks/${taskId}/approve`, {
    method: 'POST',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Не удалось одобрить задачу');
  }
}

export async function rateAiTask(taskId: number, score: number, comment?: string): Promise<void> {
  const res = await doFetch(`${API_BASE}/api/ai-team/me/tasks/${taskId}/rating`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ score, comment }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Не удалось сохранить оценку');
  }
}

// Админский список подписок
export interface AiTeamSubscriptionAdmin extends AiTeamSubscription {
  user_email?: string;
  user_name?: string;
  client_name?: string;
  client_email?: string;
}

export async function listAiTeamSubscriptions(status: 'active' | 'paused' | 'cancelled' | 'all' = 'active'): Promise<AiTeamSubscriptionAdmin[]> {
  const params = new URLSearchParams();
  if (status && status !== 'all') params.set('status', status);
  const res = await doFetch(`${API_BASE}/api/ai-team/admin/subscriptions?${params.toString()}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Не удалось загрузить подписки AI Team');
  }
  const payload = await res.json();
  return payload.subscriptions || [];
}

export interface AiTeamIncident {
  id: number;
  client_id: number;
  type: string;
  severity: string;
  description?: string;
  status: string;
  created_at: string;
  resolved_at?: string | null;
  client_name?: string;
  client_email?: string;
}

export async function listAiTeamIncidents(params?: { type?: string; status?: string }): Promise<AiTeamIncident[]> {
  const search = new URLSearchParams();
  if (params?.type) search.set('type', params.type);
  if (params?.status) search.set('status', params.status);
  const res = await doFetch(`${API_BASE}/api/ai-team/admin/incidents?${search.toString()}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Не удалось загрузить инциденты AI Team');
  }
  const payload = await res.json();
  return payload.incidents || [];
}

export async function createAiTeamIncident(params: {
  clientId: number;
  type: string;
  severity?: 'low' | 'medium' | 'high';
  description?: string;
}): Promise<{ incident: AiTeamIncident; aggressiveCount?: number | null; actions?: { paused?: boolean; cancelled?: boolean } }> {
  const res = await doFetch(`${API_BASE}/api/ai-team/admin/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Не удалось создать инцидент AI Team');
  }
  return data;
}






