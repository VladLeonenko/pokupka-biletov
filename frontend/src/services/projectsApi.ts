export interface StageUpsellOffer {
  id: number;
  title: string;
  description?: string | null;
  priceCents: number;
  status: string;
}

export interface ClientProjectStage {
  id: number;
  name: string;
  sortOrder: number;
  status: 'pending' | 'in_progress' | 'done';
  progressPercent: number;
  plannedHours?: number | null;
  spentHours?: number | null;
  budgetPlannedCents?: number | null;
  budgetSpentCents?: number | null;
  upsellPotentialCents?: number | null;
  upsellOffers?: StageUpsellOffer[];
}

export interface ProjectTask {
  id: number;
  title: string;
  description?: string | null;
  status: 'new' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: number | null;
  assignedToName?: string | null;
  assignedToEmail?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClientProject {
  id: number;
  title: string;
  mode: 'TASK_BASED' | 'RESULT_BASED' | string;
  status: 'active' | 'paused' | 'completed' | 'cancelled' | string;
  progressPercent: number;
  budgetTotalCents?: number | null;
  budgetUsedCents?: number | null;
  deadline?: string | null;
  dealTitle?: string | null;
  dealId?: number | null;
  createdAt?: string;
  updatedAt?: string;
  stages: ClientProjectStage[];
  tasks?: ProjectTask[];
  upsellOffers?: StageUpsellOffer[];
}

export interface CalcUpsellPayload {
  specialistType: string;
  complexity: 'simple' | 'medium' | 'complex';
  urgency: 'standard' | 'fast' | 'urgent';
  integrations?: number;
  hours?: number;
}

export interface CalcUpsellResult {
  specialistType: string;
  complexity: string;
  urgency: string;
  integrations: number;
  hours: number;
  ratePerHourCents: number;
  basePriceCents: number;
  finalPriceCents: number;
  coeffs: { urgency: number; integrations: number };
}

export interface ChangeRequestEstimate {
  projectId: number;
  stageId: number | null;
  specialistType: string;
  complexity: 'simple' | 'medium' | 'complex';
  hours: number;
  ratePerHourCents: number;
  basePriceCents: number;
  finalPriceCents: number;
  priority: string;
  urgency: string;
  message: string;
}

export interface UpsellOffer {
  id: number;
  projectId: number;
  stageId?: number | null;
  title: string;
  description?: string | null;
  specialistType: string;
  complexity: string;
  urgency: string;
  integrationsCount: number;
  hours: number;
  ratePerHourCents: number;
  priceCents: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectsAdminOverview {
  totals: {
    totalActiveProjects: number;
    upsellPotentialCents: number;
    conversion: number;
    accepted: number;
    declined: number;
    avgUpsellCheckCents: number;
  };
  alerts: Array<{
    type: string;
    projectId: number;
    stageId?: number;
    offerId?: number;
    clientName: string;
    message: string;
  }>;
}

export interface ClientProjectChangeRequest {
  id: number;
  projectId: number;
  stageId: number | null;
  changeType: string;
  description: string;
  priority: string;
  status: string;
  estimatedHours: number;
  estimatedPriceCents: number;
  clientApproved: boolean;
}

import { getApiBase } from '@/utils/apiBase';

const API_BASE: string = getApiBase();

function getToken(): string | null {
  try { return localStorage.getItem('auth.token'); } catch { return null; }
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

export async function getMyProjects(): Promise<ClientProject[]> {
  const res = await doFetch(`${API_BASE}/api/projects/me`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Не удалось загрузить проекты');
  }
  const data = await res.json();
  return data.projects || [];
}

export async function calcUpsell(payload: CalcUpsellPayload): Promise<CalcUpsellResult> {
  const res = await doFetch(`${API_BASE}/api/projects/calc-upsell`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Не удалось рассчитать доп. услугу');
  }
  return data as CalcUpsellResult;
}

export async function estimateChangeRequest(projectId: number, params: { stageId?: number; changeType?: string; priority?: 'low' | 'medium' | 'high'; }): Promise<ChangeRequestEstimate> {
  const res = await doFetch(`${API_BASE}/api/projects/${projectId}/change-requests/estimate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Не удалось рассчитать change request');
  }
  return data as ChangeRequestEstimate;
}

export async function getProjectUpsellOffers(projectId: number, opts?: { status?: string }): Promise<UpsellOffer[]> {
  const query = opts?.status ? `?status=${encodeURIComponent(opts.status)}` : '';
  const res = await doFetch(`${API_BASE}/api/projects/${projectId}/upsell-offers${query}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Не удалось загрузить предложения улучшений');
  }
  return (data.offers || []) as UpsellOffer[];
}

export async function acceptUpsellOffer(projectId: number, offerId: number): Promise<UpsellOffer> {
  const res = await doFetch(`${API_BASE}/api/projects/${projectId}/upsell-offers/${offerId}/accept`, {
    method: 'POST',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Не удалось подтвердить улучшение проекта');
  }
  return data.offer as UpsellOffer;
}

export async function declineUpsellOffer(projectId: number, offerId: number): Promise<UpsellOffer> {
  const res = await doFetch(`${API_BASE}/api/projects/${projectId}/upsell-offers/${offerId}/decline`, {
    method: 'POST',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Не удалось отклонить улучшение проекта');
  }
  return data.offer as UpsellOffer;
}

export async function getProjectsAdminOverview(): Promise<ProjectsAdminOverview> {
  const res = await doFetch(`${API_BASE}/api/projects/admin/overview`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Не удалось загрузить статистику по проектам');
  }
  return data as ProjectsAdminOverview;
}

export async function createClientProjectForClient(params: {
  clientId: number;
  type: 'website' | 'mobile' | 'design' | 'complex';
  title?: string;
  budgetTotalCents?: number;
  deadline?: string;
}): Promise<ClientProject> {
  const { clientId, ...body } = params;
  const res = await doFetch(`${API_BASE}/api/projects/admin/client/${clientId}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Не удалось создать проект для клиента');
  }
  return data.project as ClientProject;
}

export async function confirmChangeRequest(
  projectId: number,
  params: { stageId?: number; changeType: string; priority?: 'low' | 'medium' | 'high' }
): Promise<{ changeRequest: ClientProjectChangeRequest; upsellOfferId?: number }> {
  const res = await doFetch(`${API_BASE}/api/projects/${projectId}/change-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Не удалось подтвердить change request');
  }
  return data as { changeRequest: ClientProjectChangeRequest; upsellOfferId?: number };
}

export async function createFunnelForProject(projectId: number): Promise<{ success: boolean; funnelId: number; dealId: number; message: string }> {
  const res = await doFetch(`${API_BASE}/api/projects/${projectId}/create-funnel`, {
    method: 'POST',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Не удалось создать воронку для проекта');
  }
  return data;
}

export interface ProjectComment {
  id: number;
  projectId: number;
  stageId?: number | null;
  taskId?: number | null;
  comment: string;
  createdBy?: number | null;
  createdByClient: boolean;
  createdByName?: string | null;
  createdByEmail?: string | null;
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getProjectComments(projectId: number, stageId?: number, taskId?: number): Promise<ProjectComment[]> {
  const params = new URLSearchParams();
  if (stageId) params.append('stageId', String(stageId));
  if (taskId) params.append('taskId', String(taskId));
  const query = params.toString() ? `?${params.toString()}` : '';
  
  const res = await doFetch(`${API_BASE}/api/projects/${projectId}/comments${query}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Не удалось загрузить комментарии');
  }
  return data.comments || [];
}

export async function createProjectComment(
  projectId: number,
  comment: string,
  stageId?: number,
  taskId?: number,
  isInternal?: boolean
): Promise<ProjectComment> {
  const res = await doFetch(`${API_BASE}/api/projects/${projectId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment, stageId, taskId, isInternal }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Не удалось создать комментарий');
  }
  return data;
}

export async function deleteProject(projectId: number): Promise<void> {
  const res = await doFetch(`${API_BASE}/api/projects/${projectId}`, {
    method: 'DELETE',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Не удалось удалить проект');
  }
}

export async function getAllProjectsAdmin(clientId?: number, status?: string): Promise<ClientProject[]> {
  const params = new URLSearchParams();
  if (clientId) params.append('clientId', String(clientId));
  if (status) params.append('status', status);
  const query = params.toString() ? `?${params.toString()}` : '';
  
  const res = await doFetch(`${API_BASE}/api/projects/admin/all${query}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Не удалось загрузить проекты');
  }
  return data.projects || [];
}

