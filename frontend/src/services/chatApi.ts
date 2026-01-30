export interface Chat {
  id: number;
  client_id?: number;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  status: 'active' | 'closed' | 'archived';
  source: string;
  form_id?: string;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  unread_count?: number;
  last_message?: string;
  last_message_time?: string;
  total_orders?: number;
  total_revenue_cents?: number;
}

export interface ChatMessage {
  id: number;
  chat_id: number;
  sender_type: 'client' | 'admin' | 'bot';
  sender_id?: number;
  sender_name?: string;
  message_text?: string;
  message_type: 'text' | 'file' | 'proposal' | 'system';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  metadata?: any;
  is_read: boolean;
  is_bot_message: boolean;
  created_at: string;
}

export interface ChatWithMessages {
  chat: Chat;
  messages: ChatMessage[];
}

export interface ChatsListResponse {
  chats: Chat[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// В dev режиме используем относительные пути (проксируется через Vite)
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

// ========== ПУБЛИЧНЫЕ API (для клиентов) ==========

// Отправить сообщение от клиента
export async function sendClientMessage(
  sessionId: string,
  chatId: number | null,
  message: string,
  clientName?: string,
  clientEmail?: string,
  clientPhone?: string
): Promise<{ chatId: number; message: ChatMessage; botResponse: ChatMessage | null }> {
  const response = await fetch(`${API_BASE}/api/chat/public/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, chatId, message, clientName, clientEmail, clientPhone }),
  });
  if (!response.ok) {
    throw new Error(`Failed to send message: ${response.statusText}`);
  }
  return response.json();
}

// Получить историю чата (публичный)
export async function getChatHistory(chatId: number): Promise<ChatWithMessages> {
  const response = await fetch(`${API_BASE}/api/chat/public/${chatId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch chat: ${response.statusText}`);
  }
  return response.json();
}

// Получить или создать чат
export async function getOrCreateChat(
  sessionId: string,
  clientName?: string,
  clientEmail?: string,
  clientPhone?: string
): Promise<{ chat: Chat }> {
  const response = await fetch(`${API_BASE}/api/chat/public/get-or-create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, clientName, clientEmail, clientPhone }),
  });
  if (!response.ok) {
    throw new Error(`Failed to get or create chat: ${response.statusText}`);
  }
  return response.json();
}

// ========== АДМИНСКИЕ API ==========

// Получить список чатов
export async function listChats(filters: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  assignedTo?: number;
} = {}): Promise<ChatsListResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });

  const response = await doFetch(`${API_BASE}/api/chat?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch chats: ${response.statusText}`);
  }
  return response.json();
}

// Получить чат с сообщениями
export async function getChat(chatId: number): Promise<ChatWithMessages> {
  const response = await doFetch(`${API_BASE}/api/chat/${chatId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch chat: ${response.statusText}`);
  }
  return response.json();
}

// Загрузить файл для чата
export async function uploadChatFile(chatId: number, file: File): Promise<{ url: string; filename: string; size: number; type: string }> {
  const formData = new FormData();
  formData.append('file', file);
  
  const token = getToken();
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // НЕ добавляем Content-Type для FormData - браузер установит его автоматически с boundary
  
  const url = `${API_BASE}/api/chat/${chatId}/upload`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    console.error('[chatApi] Upload failed:', response.status, errorData);
    throw new Error(errorData.error || `Failed to upload file: ${response.statusText}`);
  }
  const result = await response.json();
  return result;
}

// Отправить сообщение от админа
export async function sendAdminMessage(
  chatId: number,
  message: string,
  messageType: 'text' | 'file' | 'proposal' = 'text',
  fileUrl?: string,
  fileName?: string,
  fileSize?: number
): Promise<ChatMessage> {
  const response = await doFetch(`${API_BASE}/api/chat/${chatId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, messageType, fileUrl, fileName, fileSize }),
  });
  if (!response.ok) {
    throw new Error(`Failed to send message: ${response.statusText}`);
  }
  return response.json();
}

// Назначить чат админу
export async function assignChat(chatId: number, userId?: number): Promise<Chat> {
  const response = await doFetch(`${API_BASE}/api/chat/${chatId}/assign`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!response.ok) {
    throw new Error(`Failed to assign chat: ${response.statusText}`);
  }
  return response.json();
}

// Изменить статус чата
export async function updateChatStatus(
  chatId: number,
  status: 'active' | 'closed' | 'archived'
): Promise<Chat> {
  const response = await doFetch(`${API_BASE}/api/chat/${chatId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    throw new Error(`Failed to update chat status: ${response.statusText}`);
  }
  return response.json();
}

