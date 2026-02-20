import { getApiBase } from '@/utils/apiBase';
import Cookies from 'js-cookie';

const API_BASE = getApiBase();

function authHeaders(): HeadersInit {
  const token = Cookies.get('auth_token') || null;
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export interface ManagerDashboard {
  adaptationPercent: number;
  completedSteps: string[];
  newClients: number;
  salesRub: number;
  proposals: number;
  plan: { plan_calls?: number; plan_sales_rub?: number; plan_deals?: number; plan_new_clients?: number };
  planProgress: {
    newClients: { current: number; plan: number };
    salesRub: { current: number; plan: number };
    deals: { current: number; plan: number };
  };
}

export async function getManagerDashboard(userId?: number): Promise<ManagerDashboard> {
  const url = userId ? `${API_BASE}/api/sales-analytics/manager/dashboard?userId=${userId}` : `${API_BASE}/api/sales-analytics/manager/dashboard`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error('Ошибка загрузки дашборда');
  return res.json();
}

export async function updateAdaptation(data: { progress_percent?: number; completed_steps?: string[]; userId?: number }): Promise<void> {
  const res = await fetch(`${API_BASE}/api/sales-analytics/manager/adaptation`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Ошибка обновления');
}

export interface SalesOverview {
  managers: { userId: number; name: string; newClients: number; salesRub: number; plan: any }[];
  totals: { newClients: number; salesRub: number };
  month: string;
}

export async function getSalesOverview(month?: string): Promise<SalesOverview> {
  const url = month ? `${API_BASE}/api/sales-analytics/admin/overview?month=${encodeURIComponent(month)}` : `${API_BASE}/api/sales-analytics/admin/overview`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error('Ошибка загрузки');
  return res.json();
}

export interface ManagerMonthStats {
  month: string;
  newClients: number;
  salesRub: number;
  planNewClients: number | null;
  planSalesRub: number | null;
}

export interface ManagerDynamics {
  userId: number;
  name: string;
  months: ManagerMonthStats[];
}

export async function getManagerDynamics(months?: number): Promise<{ dynamics: ManagerDynamics[] }> {
  const url = months ? `${API_BASE}/api/sales-analytics/admin/manager-dynamics?months=${months}` : `${API_BASE}/api/sales-analytics/admin/manager-dynamics`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error('Ошибка загрузки динамики');
  return res.json();
}

export async function getPlans(month?: string): Promise<any[]> {
  const url = month ? `${API_BASE}/api/sales-analytics/admin/plans?month=${month}` : `${API_BASE}/api/sales-analytics/admin/plans`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error('Ошибка загрузки планов');
  return res.json();
}

export async function savePlan(data: { user_id: number; month: string; plan_calls?: number; plan_sales_rub?: number; plan_deals?: number; plan_new_clients?: number }): Promise<any> {
  const res = await fetch(`${API_BASE}/api/sales-analytics/admin/plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Ошибка сохранения');
  return res.json();
}
