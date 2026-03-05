import { getApiBase } from '@/utils/apiBase';
import { getAuthToken } from '@/utils/authStorage';

const API_BASE = getApiBase();

function authHeaders(init?: HeadersInit): HeadersInit {
  const token = getAuthToken();
  return {
    ...init,
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface PipelineLead {
  id: number;
  name: string;
  company: string;
  email: string;
  phone?: string;
  source: string;
  stage: string;
  website?: string;
  audit_score?: number;
  business_potential?: string;
  last_outreach_at?: string;
  last_reply_at?: string;
  created_at: string;
  updated_at: string;
}

export async function listPipelineLeads(params?: {
  page?: number;
  limit?: number;
  stage?: string;
  search?: string;
}): Promise<{ items: PipelineLead[]; total: number; page: number; limit: number }> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.stage) queryParams.append('stage', params.stage);
  if (params?.search) queryParams.append('search', params.search);

  const response = await fetch(`${API_BASE}/api/sales-pipeline/leads?${queryParams}`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error('Ошибка загрузки лидов');
  return response.json();
}

export async function importPipelineLeads(file: File): Promise<{ imported: number; total: number }> {
  const formData = new FormData();
  formData.append('file', file);

  const token = getAuthToken();
  const response = await fetch(`${API_BASE}/api/sales-pipeline/leads/import`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Ошибка импорта');
  }
  return response.json();
}

export async function updatePipelineLead(
  id: number,
  data: { stage?: string; website?: string; name?: string; company?: string; phone?: string }
): Promise<PipelineLead> {
  const response = await fetch(`${API_BASE}/api/sales-pipeline/leads/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Ошибка обновления');
  }
  return response.json();
}

export async function createPipelineLead(data: {
  name?: string;
  company?: string;
  email: string;
  phone?: string;
  website?: string;
}): Promise<{ created: boolean; lead: PipelineLead }> {
  const response = await fetch(`${API_BASE}/api/sales-pipeline/leads`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Ошибка создания');
  }
  return response.json();
}

export async function deletePipelineLead(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/api/sales-pipeline/leads/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Ошибка удаления');
  }
}

export async function massDeletePipelineLeads(ids: number[]): Promise<{ deleted: number }> {
  const response = await fetch(`${API_BASE}/api/sales-pipeline/leads/mass-delete`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Ошибка удаления');
  }
  return response.json();
}

export async function sendNowPipelineLead(id: number): Promise<{
  processed?: number;
  sent?: number;
  sendErrors?: Array<{ email: string; reason: string }>;
}> {
  const response = await fetch(`${API_BASE}/api/sales-pipeline/leads/${id}/send-now`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Ошибка отправки');
  }
  return response.json();
}

export interface PipelineSettings {
  batchSize: number;
  maxEmailsPerRun: number | null;
  preferredCronExpression?: string;
  cronSecretSet: boolean;
}

export async function getPipelineSettings(): Promise<PipelineSettings> {
  const response = await fetch(`${API_BASE}/api/sales-pipeline/settings`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error('Ошибка загрузки настроек');
  return response.json();
}

export async function updatePipelineSettings(data: {
  batchSize?: number;
  maxEmailsPerRun?: number | null;
  preferredCronExpression?: string;
}): Promise<PipelineSettings> {
  const response = await fetch(`${API_BASE}/api/sales-pipeline/settings`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Ошибка сохранения');
  }
  return response.json();
}

export interface PipelineTemplate {
  key: string;
  name: string;
  templateId: number;
}

export async function getPipelineTemplates(): Promise<PipelineTemplate[]> {
  const response = await fetch(`${API_BASE}/api/sales-pipeline/templates`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error('Ошибка загрузки шаблонов');
  return response.json();
}

export async function getPipelineTemplatePreview(key: string): Promise<{ subject: string; html: string }> {
  const response = await fetch(`${API_BASE}/api/sales-pipeline/templates/preview/${encodeURIComponent(key)}`, {
    headers: authHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Ошибка загрузки превью');
  }
  return response.json();
}
