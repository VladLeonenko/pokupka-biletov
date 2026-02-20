import { getApiBase } from '@/utils/apiBase';
import Cookies from 'js-cookie';

const API_BASE = getApiBase();

function authHeaders(): HeadersInit {
  const token = Cookies.get('auth_token') || null;
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export interface TrainingMaterial {
  id: number;
  type: 'call_script' | 'objection' | 'admin_guide' | 'sales_tip';
  title: string;
  content?: string | null;
  objection_text?: string | null;
  solution_text?: string | null;
  sort_order: number;
}

export async function getMaterials(type?: string): Promise<TrainingMaterial[]> {
  const url = type ? `${API_BASE}/api/sales-academy/materials?type=${encodeURIComponent(type)}` : `${API_BASE}/api/sales-academy/materials`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error('Ошибка загрузки материалов');
  return res.json();
}

export async function getProductMatrix(): Promise<{ products: any[]; categories: any[] }> {
  const res = await fetch(`${API_BASE}/api/sales-academy/product-matrix`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Ошибка загрузки матрицы');
  return res.json();
}

export async function getCases(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/sales-academy/cases`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Ошибка загрузки кейсов');
  return res.json();
}
