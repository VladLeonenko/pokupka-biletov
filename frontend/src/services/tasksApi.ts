import { Task } from '@/types/cms';
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

export interface ParsedTask {
  title: string;
  description: string;
  status: 'new' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'development' | 'marketing' | 'business' | 'operations' | 'support' | 'other';
  project_id: number | null;
  due_date: string | null;
  tags: string[];
  deal_id: number | null;
}

export interface ParseVoiceTaskResponse {
  success: boolean;
  task: ParsedTask;
}

// Парсинг голосового ввода задачи через AI
export async function parseVoiceTask(
  voiceText: string,
  availableProjects: Array<{ id: number; name: string }> = []
): Promise<ParseVoiceTaskResponse> {
  const response = await fetch(`${API_BASE}/api/tasks/parse-voice`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ voiceText, availableProjects }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || `Failed to parse voice task: ${response.statusText}`);
  }

  return response.json();
}







