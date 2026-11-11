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
      throw new Error('Некорректный JSON в ответе');
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

export type AdsMediaplanStatus = 'planned' | 'active' | 'paused' | 'done' | 'rejected';

export type AdsMediaplanItem = {
  id: number;
  event_slug: string;
  event_title: string;
  venue?: string | null;
  event_date?: string | null;
  lp_url?: string | null;
  status: AdsMediaplanStatus;
  priority: number;
  sort_order: number;
  daily_budget_rub?: number | null;
  total_budget_rub?: number | null;
  campaign_name?: string | null;
  campaign_id?: number | null;
  research_json?: {
    wordstat?: Array<{ phrase: string; count?: number; region?: number; at?: string }>;
    competitors?: string[];
    snippets?: string[];
    sources?: string[];
    why?: string;
    scannedAt?: string;
  };
  seo_title?: string | null;
  seo_description?: string | null;
  seo_h1?: string | null;
  seo_keywords?: string | null;
  seo_score?: number | null;
  seo_score_live?: number | null;
  seo_score_fail?: string[];
  seo_score_notes?: string | null;
  body_excerpt?: string | null;
  forecast_impressions?: number | null;
  forecast_clicks?: number | null;
  forecast_cpc_rub?: number | null;
  forecast_conversions?: number | null;
  forecast_notes?: string | null;
  hot_keywords?: string[];
  negative_keywords?: string[];
  ad_titles?: string[];
  ad_texts?: string[];
  notes?: string | null;
  updated_at?: string;
};

export function linesToArr(s: string): string[] {
  return s
    .split(/\n|,/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function arrToLines(a?: string[] | null): string {
  return (a || []).join('\n');
}

export async function fetchAdsMediaplan(): Promise<AdsMediaplanItem[]> {
  const res = await fetch(`${API_BASE}/api/admin/ads-mediaplan`, { headers: authHeaders() });
  const data = await handle<{ items: AdsMediaplanItem[] }>(res);
  return data.items || [];
}

export async function createAdsMediaplanItem(
  body: Partial<AdsMediaplanItem>,
): Promise<AdsMediaplanItem> {
  const res = await fetch(`${API_BASE}/api/admin/ads-mediaplan`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await handle<{ item: AdsMediaplanItem }>(res);
  return data.item;
}

export async function updateAdsMediaplanItem(
  id: number,
  body: Partial<AdsMediaplanItem>,
): Promise<AdsMediaplanItem> {
  const res = await fetch(`${API_BASE}/api/admin/ads-mediaplan/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await handle<{ item: AdsMediaplanItem }>(res);
  return data.item;
}

export async function deleteAdsMediaplanItem(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/ads-mediaplan/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await handle(res);
}

export async function scanAdsMediaplan(opts: { add?: boolean; limit?: number }) {
  const res = await fetch(`${API_BASE}/api/admin/ads-mediaplan/actions/scan`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(opts),
  });
  return handle<{
    scannedEvents: number;
    wordstatPhrases: number;
    candidates: Array<{
      event_slug: string;
      event_title: string;
      demandScore: number;
      wordstat: Array<{ phrase: string; count?: number }>;
    }>;
    added: AdsMediaplanItem[];
  }>(res);
}

export async function rescoreAdsMediaplan(id: number): Promise<AdsMediaplanItem> {
  const res = await fetch(`${API_BASE}/api/admin/ads-mediaplan/actions/rescore/${id}`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const data = await handle<{ item: AdsMediaplanItem }>(res);
  return data.item;
}
