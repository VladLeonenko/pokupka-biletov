export interface ChatbotRule {
  id: number;
  name: string;
  keywords: string[];
  response_text?: string;
  response_type: 'text' | 'file' | 'proposal' | 'redirect';
  file_url?: string;
  file_name?: string;
  proposal_template_id?: number;
  redirect_url?: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProposalTemplate {
  id: number;
  name: string;
  title: string;
  content: string;
  file_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatbotStats {
  overview: {
    total_interactions: number;
    unique_chats: number;
    rules_used: number;
  };
  topRules: Array<{
    id: number;
    name: string;
    usage_count: number;
  }>;
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

// ========== ПРАВИЛА ЧАТ-БОТА ==========

export async function listChatbotRules(): Promise<ChatbotRule[]> {
  const response = await doFetch(`${API_BASE}/api/chatbot/rules`);
  if (!response.ok) {
    throw new Error(`Failed to fetch rules: ${response.statusText}`);
  }
  return response.json();
}

export async function getChatbotRule(id: number): Promise<ChatbotRule> {
  const response = await doFetch(`${API_BASE}/api/chatbot/rules/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch rule: ${response.statusText}`);
  }
  return response.json();
}

export async function createChatbotRule(rule: Partial<ChatbotRule>): Promise<ChatbotRule> {
  const response = await doFetch(`${API_BASE}/api/chatbot/rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rule),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to create rule: ${response.statusText}`);
  }
  return response.json();
}

export async function updateChatbotRule(id: number, rule: Partial<ChatbotRule>): Promise<ChatbotRule> {
  const response = await doFetch(`${API_BASE}/api/chatbot/rules/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rule),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to update rule: ${response.statusText}`);
  }
  return response.json();
}

export async function deleteChatbotRule(id: number): Promise<void> {
  const response = await doFetch(`${API_BASE}/api/chatbot/rules/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to delete rule: ${response.statusText}`);
  }
}

// ========== ШАБЛОНЫ КОММЕРЧЕСКИХ ПРЕДЛОЖЕНИЙ ==========

export async function listProposalTemplates(): Promise<ProposalTemplate[]> {
  const response = await doFetch(`${API_BASE}/api/chatbot/proposals`);
  if (!response.ok) {
    throw new Error(`Failed to fetch proposals: ${response.statusText}`);
  }
  return response.json();
}

export async function getProposalTemplate(id: number): Promise<ProposalTemplate> {
  const response = await doFetch(`${API_BASE}/api/chatbot/proposals/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch proposal: ${response.statusText}`);
  }
  return response.json();
}

export async function createProposalTemplate(template: Partial<ProposalTemplate>): Promise<ProposalTemplate> {
  const response = await doFetch(`${API_BASE}/api/chatbot/proposals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to create proposal: ${response.statusText}`);
  }
  return response.json();
}

export async function updateProposalTemplate(id: number, template: Partial<ProposalTemplate>): Promise<ProposalTemplate> {
  const response = await doFetch(`${API_BASE}/api/chatbot/proposals/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to update proposal: ${response.statusText}`);
  }
  return response.json();
}

export async function deleteProposalTemplate(id: number): Promise<void> {
  const response = await doFetch(`${API_BASE}/api/chatbot/proposals/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to delete proposal: ${response.statusText}`);
  }
}

// ========== АНАЛИТИКА ==========

export async function getChatbotStats(startDate?: string, endDate?: string): Promise<ChatbotStats> {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const response = await doFetch(`${API_BASE}/api/chatbot/stats?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch stats: ${response.statusText}`);
  }
  return response.json();
}

