const API_BASE = '';

// Получаем токен из localStorage
function getToken(): string | null {
  return localStorage.getItem('token');
}

// Заголовки с авторизацией
function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

// Базовая функция для fetch с обработкой ошибок
async function doFetch(url: string, options?: RequestInit) {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export interface Site {
  id: number;
  uuid: string;
  domain: string;
  name: string;
  type: 'main' | 'blog' | 'enterprise' | 'landing';
  status: 'active' | 'inactive' | 'pending';
  template_name?: string;
  settings?: any;
  created_at: string;
  updated_at: string;
}

export interface SitePage {
  id: number;
  uuid: string;
  site_id: number;
  slug: string;
  title: string;
  body?: string;
  content?: any;
  seo_title?: string;
  seo_description?: string;
  is_published: boolean;
  settings?: any;
  created_at: string;
  updated_at: string;
}

export interface SiteBlock {
  id: number;
  uuid: string;
  site_id: number;
  name: string;
  type: 'hero' | 'text' | 'image' | 'faq' | 'form' | 'custom';
  content: any;
  settings?: any;
  created_at: string;
  updated_at: string;
}

export interface SiteLead {
  id: number;
  uuid: string;
  site_id: number;
  form_name?: string;
  data: any;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  ip_address?: string;
  created_at: string;
}

// Sites
export async function listSites(): Promise<Site[]> {
  return doFetch('/api/sites');
}

export async function getSite(id: number): Promise<Site> {
  return doFetch(`/api/sites/${id}`);
}

export async function createSite(data: Partial<Site>): Promise<Site> {
  return doFetch('/api/sites', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSite(id: number, data: Partial<Site>): Promise<Site> {
  return doFetch(`/api/sites/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSite(id: number): Promise<void> {
  return doFetch(`/api/sites/${id}`, {
    method: 'DELETE',
  });
}

// Site Pages
export async function listSitePages(siteId: number): Promise<SitePage[]> {
  return doFetch(`/api/sites/${siteId}/pages`);
}

export async function getSitePage(siteId: number, pageId: number): Promise<SitePage> {
  return doFetch(`/api/sites/${siteId}/pages/${pageId}`);
}

export async function createSitePage(siteId: number, data: Partial<SitePage>): Promise<SitePage> {
  return doFetch(`/api/sites/${siteId}/pages`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSitePage(siteId: number, pageId: number, data: Partial<SitePage>): Promise<SitePage> {
  return doFetch(`/api/sites/${siteId}/pages/${pageId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSitePage(siteId: number, pageId: number): Promise<void> {
  return doFetch(`/api/sites/${siteId}/pages/${pageId}`, {
    method: 'DELETE',
  });
}

// Site Blocks
export async function listSiteBlocks(siteId: number): Promise<SiteBlock[]> {
  return doFetch(`/api/sites/${siteId}/blocks`);
}

export async function getSiteBlock(siteId: number, blockId: number): Promise<SiteBlock> {
  return doFetch(`/api/sites/${siteId}/blocks/${blockId}`);
}

export async function createSiteBlock(siteId: number, data: Partial<SiteBlock>): Promise<SiteBlock> {
  return doFetch(`/api/sites/${siteId}/blocks`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSiteBlock(siteId: number, blockId: number, data: Partial<SiteBlock>): Promise<SiteBlock> {
  return doFetch(`/api/sites/${siteId}/blocks/${blockId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSiteBlock(siteId: number, blockId: number): Promise<void> {
  return doFetch(`/api/sites/${siteId}/blocks/${blockId}`, {
    method: 'DELETE',
  });
}

// Site Leads
export async function listSiteLeads(siteId: number): Promise<SiteLead[]> {
  return doFetch(`/api/sites/${siteId}/leads`);
}

export async function submitSiteLead(data: {
  site_id: number;
  form_name?: string;
  data: any;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}): Promise<SiteLead> {
  return doFetch('/api/sites/public/lead', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getSitePages(siteId: number): Promise<SitePage[]> {
  return listSitePages(siteId);
}
