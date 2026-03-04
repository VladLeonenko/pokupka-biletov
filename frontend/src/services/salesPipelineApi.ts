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
