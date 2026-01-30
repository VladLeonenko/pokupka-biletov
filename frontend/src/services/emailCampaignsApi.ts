import { getApiBase } from '@/utils/apiBase';

const API_BASE: string = getApiBase();

function getToken(): string | null {
  try {
    return localStorage.getItem('auth.token');
  } catch {
    return null;
  }
}

function authHeaders(init?: HeadersInit): HeadersInit {
  const token = getToken();
  return {
    ...init,
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ==================== ПОДПИСЧИКИ ====================

export interface EmailSubscriber {
  id: number;
  email: string;
  name?: string;
  phone?: string;
  status: 'active' | 'unsubscribed' | 'bounced' | 'complained';
  tags?: string[];
  custom_fields?: Record<string, any>;
  subscribed_at: string;
  unsubscribed_at?: string;
  created_at: string;
  updated_at: string;
}

export async function listSubscribers(params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}): Promise<{ subscribers: EmailSubscriber[]; total: number; page: number; limit: number }> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.status) queryParams.append('status', params.status);
  if (params?.search) queryParams.append('search', params.search);

  const response = await fetch(`${API_BASE}/api/email/subscribers?${queryParams}`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error('Ошибка при получении подписчиков');
  }

  return response.json();
}

export async function createSubscriber(data: {
  email: string;
  name?: string;
  phone?: string;
  tags?: string[];
  custom_fields?: Record<string, any>;
}): Promise<EmailSubscriber> {
  const response = await fetch(`${API_BASE}/api/email/subscribers`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Ошибка при создании подписчика' }));
    throw new Error(error.error || 'Ошибка при создании подписчика');
  }

  return response.json();
}

export async function updateSubscriber(
  id: number,
  data: Partial<EmailSubscriber>
): Promise<EmailSubscriber> {
  const response = await fetch(`${API_BASE}/api/email/subscribers/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Ошибка при обновлении подписчика' }));
    throw new Error(error.error || 'Ошибка при обновлении подписчика');
  }

  return response.json();
}

export async function deleteSubscriber(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/api/email/subscribers/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error('Ошибка при удалении подписчика');
  }
}

export async function importSubscribers(file: File): Promise<{
  imported: number;
  errors: number;
  details: any[];
}> {
  const formData = new FormData();
  formData.append('file', file);

  const token = getToken();
  const response = await fetch(`${API_BASE}/api/email/subscribers/import`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Ошибка при импорте подписчиков' }));
    throw new Error(error.error || 'Ошибка при импорте подписчиков');
  }

  return response.json();
}

// ==================== ШАБЛОНЫ ====================

export interface EmailTemplate {
  id: number;
  name: string;
  subject?: string;
  html_content?: string;
  text_content?: string;
  is_active: boolean;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export async function listTemplates(): Promise<EmailTemplate[]> {
  const response = await fetch(`${API_BASE}/api/email/templates`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error('Ошибка при получении шаблонов');
  }

  return response.json();
}

export async function createTemplate(data: {
  name: string;
  subject?: string;
  html_content?: string;
  text_content?: string;
}): Promise<EmailTemplate> {
  const response = await fetch(`${API_BASE}/api/email/templates`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Ошибка при создании шаблона' }));
    throw new Error(error.error || 'Ошибка при создании шаблона');
  }

  return response.json();
}

export async function updateTemplate(
  id: number,
  data: Partial<EmailTemplate>
): Promise<EmailTemplate> {
  const response = await fetch(`${API_BASE}/api/email/templates/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Ошибка при обновлении шаблона' }));
    throw new Error(error.error || 'Ошибка при обновлении шаблона');
  }

  return response.json();
}

export async function deleteTemplate(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/api/email/templates/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error('Ошибка при удалении шаблона');
  }
}

// ==================== РАССЫЛКИ ====================

export interface EmailCampaign {
  id: number;
  name: string;
  subject: string;
  html_content?: string;
  text_content?: string;
  template_id?: number;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';
  scheduled_at?: string;
  sent_at?: string;
  from_email?: string;
  from_name?: string;
  reply_to?: string;
  segment_filter?: Record<string, any>;
  total_recipients: number;
  created_by?: number;
  created_at: string;
  updated_at: string;
  // Статистика (приходит с сервера)
  total_sent?: number;
  delivered?: number;
  opened?: number;
  clicked?: number;
}

export interface CampaignStats {
  total_sent: number;
  delivered: number;
  bounced: number;
  failed: number;
  opened: number;
  clicked: number;
  replied: number;
}

export async function listCampaigns(): Promise<EmailCampaign[]> {
  const response = await fetch(`${API_BASE}/api/email/campaigns`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error('Ошибка при получении рассылок');
  }

  return response.json();
}

export async function getCampaign(id: number): Promise<{
  campaign: EmailCampaign;
  stats: CampaignStats;
}> {
  const response = await fetch(`${API_BASE}/api/email/campaigns/${id}`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error('Ошибка при получении рассылки');
  }

  return response.json();
}

export async function createCampaign(data: {
  name: string;
  subject: string;
  html_content?: string;
  text_content?: string;
  template_id?: number;
  from_email?: string;
  from_name?: string;
  reply_to?: string;
  segment_filter?: Record<string, any>;
  scheduled_at?: string;
}): Promise<EmailCampaign> {
  const response = await fetch(`${API_BASE}/api/email/campaigns`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Ошибка при создании рассылки' }));
    throw new Error(error.error || 'Ошибка при создании рассылки');
  }

  return response.json();
}

export async function updateCampaign(
  id: number,
  data: Partial<EmailCampaign>
): Promise<EmailCampaign> {
  const response = await fetch(`${API_BASE}/api/email/campaigns/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Ошибка при обновлении рассылки' }));
    throw new Error(error.error || 'Ошибка при обновлении рассылки');
  }

  return response.json();
}

export async function sendCampaign(id: number): Promise<{
  success: boolean;
  sent: number;
  errors: number;
  total: number;
}> {
  const response = await fetch(`${API_BASE}/api/email/campaigns/${id}/send`, {
    method: 'POST',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Ошибка при отправке рассылки' }));
    throw new Error(error.error || 'Ошибка при отправке рассылки');
  }

  return response.json();
}

