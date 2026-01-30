export interface Client {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  source: 'manual' | 'form' | 'chatbot' | 'phone' | 'email' | 'other';
  source_details?: string;
  status: 'lead' | 'client' | 'inactive' | 'lost';
  notes?: string;
  total_orders: number;
  total_revenue_cents: number;
  average_order_value_cents?: number;
  first_order_date?: string;
  last_order_date?: string;
  created_at: string;
  updated_at: string;
  created_by?: number;
  created_by_name?: string;
  orders?: Array<{
    id: number;
    order_number: string;
    status: string;
    total_cents: number;
    created_at: string;
  }>;
}

export interface ClientsListResponse {
  clients: Client[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ClientsFilters {
  page?: number;
  limit?: number;
  search?: string;
  source?: string;
  status?: string;
  minLTV?: number;
  maxLTV?: number;
  minAvgOrder?: number;
  maxAvgOrder?: number;
  minOrders?: number;
  maxOrders?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
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

// Получить список клиентов
export async function listClients(filters: ClientsFilters = {}): Promise<ClientsListResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });

  const response = await doFetch(`${API_BASE}/api/clients?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch clients: ${response.statusText}`);
  }
  return response.json();
}

// Получить клиента по ID
export async function getClient(id: number): Promise<Client> {
  const response = await doFetch(`${API_BASE}/api/clients/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch client: ${response.statusText}`);
  }
  return response.json();
}

// Создать клиента
export async function createClient(client: Partial<Client>): Promise<Client> {
  const response = await doFetch(`${API_BASE}/api/clients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(client),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to create client: ${response.statusText}`);
  }
  return response.json();
}

// Обновить клиента
export async function updateClient(id: number, client: Partial<Client>): Promise<Client> {
  const response = await doFetch(`${API_BASE}/api/clients/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(client),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to update client: ${response.statusText}`);
  }
  return response.json();
}

// Удалить клиента
export async function deleteClient(id: number): Promise<void> {
  const response = await doFetch(`${API_BASE}/api/clients/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to delete client: ${response.statusText}`);
  }
}

// Связать клиента с заказом
export async function linkClientOrder(clientId: number, orderId: number): Promise<void> {
  const response = await doFetch(`${API_BASE}/api/clients/${clientId}/orders/${orderId}`, {
    method: 'POST',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to link order: ${response.statusText}`);
  }
}

// Экспорт клиентов в CSV
export async function exportClientsToCSV(filters: ClientsFilters = {}): Promise<Blob> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });

  const response = await doFetch(`${API_BASE}/api/clients/export/csv?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to export clients: ${response.statusText}`);
  }
  return response.blob();
}

