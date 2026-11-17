import { getApiBase } from '@/utils/apiBase';
import Cookies from 'js-cookie';

const API_BASE = getApiBase();

function authHeaders(): HeadersInit {
  const token = Cookies.get('auth_token') || null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handle<T>(res: Response): Promise<T> {
  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      if (!res.ok) throw new Error(`Ошибка ${res.status}`);
      throw new Error('Некорректный JSON');
    }
  }
  if (!res.ok) {
    const msg =
      parsed && typeof parsed === 'object' && parsed !== null && 'error' in parsed
        ? String((parsed as { error: unknown }).error)
        : `Ошибка ${res.status}`;
    throw new Error(msg);
  }
  return parsed as T;
}

export type ReferralAgent = {
  id: number;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  commission_type: 'percent' | 'fixed';
  commission_value: number;
  cookie_days: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  public_link: string;
};

export type ReferralAgentStats = ReferralAgent & {
  clicks: number;
  visitors: number;
  checkouts: number;
  abandoned: number;
  paid_orders: number;
  paid_cents: number;
  commission_cents: number;
  reversed_orders: number;
  conversion_rate: number;
  checkout_rate: number;
  abandon_rate: number;
  metrika?: { visits: number; users: number; bounceRate: number } | null;
};

export type ReferralAnalytics = {
  from: string;
  to: string;
  totals: {
    clicks: number;
    visitors: number;
    checkouts: number;
    abandoned: number;
    paidOrders: number;
    paidCents: number;
    commissionCents: number;
  };
  agents: ReferralAgentStats[];
  metrika?: { ok: boolean; reason?: string; byCode?: Record<string, unknown> } | null;
};

export type ReferralOrderRow = {
  id: number;
  order_number: string;
  status: string;
  payment_status: string;
  total_cents: number;
  currency: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  created_at: string;
  event_title: string | null;
  conversion_status: string | null;
  commission_cents: number | null;
};

export async function listReferralAgents(): Promise<ReferralAgent[]> {
  const data = await handle<{ agents: ReferralAgent[] }>(
    await fetch(`${API_BASE}/api/referral/admin/agents`, { headers: authHeaders() }),
  );
  return data.agents || [];
}

export async function createReferralAgent(
  body: Partial<ReferralAgent> & { code: string; name: string },
): Promise<ReferralAgent> {
  const data = await handle<{ agent: ReferralAgent }>(
    await fetch(`${API_BASE}/api/referral/admin/agents`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    }),
  );
  return data.agent;
}

export async function updateReferralAgent(
  id: number,
  body: Partial<ReferralAgent>,
): Promise<ReferralAgent> {
  const data = await handle<{ agent: ReferralAgent }>(
    await fetch(`${API_BASE}/api/referral/admin/agents/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(body),
    }),
  );
  return data.agent;
}

export async function deactivateReferralAgent(id: number): Promise<void> {
  await handle(await fetch(`${API_BASE}/api/referral/admin/agents/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }));
}

export async function getReferralAnalytics(params?: {
  from?: string;
  to?: string;
  agentId?: number;
  metrika?: boolean;
}): Promise<ReferralAnalytics> {
  const qs = new URLSearchParams();
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  if (params?.agentId) qs.set('agentId', String(params.agentId));
  if (params?.metrika === false) qs.set('metrika', '0');
  const data = await handle<ReferralAnalytics>(
    await fetch(`${API_BASE}/api/referral/admin/analytics?${qs}`, {
      headers: authHeaders(),
    }),
  );
  return data;
}

export async function listReferralAgentOrders(
  agentId: number,
  params?: { from?: string; to?: string },
): Promise<ReferralOrderRow[]> {
  const qs = new URLSearchParams();
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  const data = await handle<{ orders: ReferralOrderRow[] }>(
    await fetch(`${API_BASE}/api/referral/admin/agents/${agentId}/orders?${qs}`, {
      headers: authHeaders(),
    }),
  );
  return data.orders || [];
}
