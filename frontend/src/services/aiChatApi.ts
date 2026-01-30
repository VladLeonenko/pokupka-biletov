export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface AIChatResponse {
  success: boolean;
  message: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  } | null;
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

// Отправить сообщение в AI-чат (публичный, без авторизации)
export async function sendAIMessage(
  message: string,
  conversationHistory: AIMessage[] = []
): Promise<AIChatResponse> {
  const response = await fetch(`${API_BASE}/api/ai-chat/public`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, conversationHistory }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || `Failed to send message: ${response.statusText}`);
  }

  return response.json();
}

// Отправить сообщение в AI-чат (для админов, с авторизацией)
export async function sendAIMessageAuth(
  message: string,
  conversationHistory: AIMessage[] = []
): Promise<AIChatResponse> {
  const response = await fetch(`${API_BASE}/api/ai-chat`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, conversationHistory }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || `Failed to send message: ${response.statusText}`);
  }

  return response.json();
}

// Получить историю AI-чата (опционально)
export async function getAIChatHistory(): Promise<AIMessage[]> {
  const response = await fetch(`${API_BASE}/api/ai-chat/history`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch history: ${response.statusText}`);
  }

  const data = await response.json();
  return data.history || [];
}

