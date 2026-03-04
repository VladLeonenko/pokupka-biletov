// Public API functions (no authentication required)
import { getApiBase } from '@/utils/apiBase';

// Вычисляем динамически, а не один раз при загрузке модуля
function getApiBaseUrl(): string {
  return getApiBase();
}

async function publicFetch(input: string, init?: RequestInit): Promise<Response> {
  return await fetch(input, { ...(init || {}), headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
}

export async function getPublicPage(slug: string): Promise<any | null> {
  // Normalize slug
  let normalizedSlug = slug.trim();
  if (!normalizedSlug || normalizedSlug === '') {
    normalizedSlug = '/';
  } else if (normalizedSlug !== '/') {
    // Ensure slug starts with / and remove trailing slash
    normalizedSlug = '/' + normalizedSlug.replace(/^\/+|\/+$/g, '');
  }
  
  // Handle root slug - use query parameter to avoid URL encoding issues
  let url: string;
  if (normalizedSlug === '/') {
    // Use query parameter for root slug to avoid Express routing issues with %2F
    url = `${getApiBaseUrl()}/api/public/pages?slug=/`;
  } else {
    // Use regular slug endpoint (no encoding needed, Express will handle it)
    url = `${getApiBaseUrl()}/api/public/pages${normalizedSlug}`;
  }
  
  const res = await publicFetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch page');
  const row = await res.json();
  return mapRowToPage(row);
}

function mapRowToPage(row: any): any {
  return {
    id: row.slug || '',
    path: row.slug || '',
    title: row.title ?? '',
    html: row.body ?? '',
    seo: {
      metaTitle: row.seo_title || undefined,
      metaDescription: row.seo_description || undefined,
      metaKeywords: Array.isArray(row.seo_keywords) ? row.seo_keywords : undefined,
      canonicalUrl: row.canonical_url || undefined,
      robotsIndex: row.robots_index,
      robotsFollow: row.robots_follow,
      ogTitle: row.og_title || undefined,
      ogDescription: row.og_description || undefined,
      ogImageUrl: row.og_image_url || undefined,
      twitterCard: row.twitter_card || undefined,
      twitterSite: row.twitter_site || undefined,
      twitterCreator: row.twitter_creator || undefined,
      structuredDataJson: row.structured_data ? JSON.stringify(row.structured_data) : undefined,
      hreflang: Array.isArray(row.hreflang) ? row.hreflang : undefined,
    },
    isPublished: Boolean(row.is_published),
  };
}

export async function getPublicPartials(): Promise<{ head?: string; header?: string; footer?: string }> {
  const res = await publicFetch(`${getApiBaseUrl()}/api/public/partials`);
  if (!res.ok) throw new Error('Failed to fetch partials');
  return await res.json();
}

export async function listPublicBlogPosts(opts?: { limit?: number; offset?: number; category?: string }): Promise<{ posts: any[]; total: number }> {
  const limit = opts?.limit ?? 12;
  const offset = opts?.offset ?? 0;
  const category = opts?.category && opts.category !== 'all' ? opts.category : '';
  const params = new URLSearchParams({ published: 'true', limit: String(limit), offset: String(offset) });
  if (category) params.set('category_slug', category);
  const res = await publicFetch(`${getApiBaseUrl()}/api/public/blog?${params}`);
  if (!res.ok) throw new Error('Failed to fetch blog posts');
  const data = await res.json();
  if (Array.isArray(data)) return { posts: data, total: data.length };
  return { posts: data.posts || [], total: data.total ?? 0 };
}

export async function listPublicBlogHighlights(): Promise<any[]> {
  const res = await publicFetch(`${getApiBaseUrl()}/api/public/blog?published=true&featured=true`);
  if (!res.ok) throw new Error('Failed to fetch blog highlights');
  const data = await res.json();
  return Array.isArray(data) ? data : (data?.posts ?? []);
}

export async function getPublicBlogPost(slug: string): Promise<any> {
  const res = await publicFetch(`${getApiBaseUrl()}/api/public/blog/${encodeURIComponent(slug)}`);
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error('Failed to fetch blog post');
  return await res.json();
}

export async function listPublicProducts(): Promise<any[]> {
  const res = await publicFetch(`${getApiBaseUrl()}/api/public/products?active=true`);
  if (!res.ok) throw new Error('Failed to fetch products');
  return await res.json();
}

export async function getPublicProduct(slug: string): Promise<any> {
  const res = await publicFetch(`${getApiBaseUrl()}/api/public/products/${encodeURIComponent(slug)}`);
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error('Failed to fetch product');
  return await res.json();
}

const FETCH_TIMEOUT_MS = 45000;

export async function listPublicCases(): Promise<any[]> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const url = `${getApiBaseUrl()}/api/public/cases?published=true`;
    const res = await publicFetch(url, { signal: ctrl.signal });
    clearTimeout(to);
    if (!res.ok) throw new Error(`Ошибка ${res.status}: ${res.statusText}`);
    return await res.json();
  } catch (e: any) {
    clearTimeout(to);
    if (e?.name === 'AbortError') throw new Error('Таймаут загрузки кейсов (45 сек)');
    if (e?.message?.includes('fetch')) throw new Error('Сеть недоступна. Проверьте соединение.');
    throw e;
  }
}

export async function listHomeCases(): Promise<Array<{ id: string; slug: string; title: string; year: string; type: string; image: string; link: string }>> {
  const res = await publicFetch(`${getApiBaseUrl()}/api/public/cases/home`);
  if (!res.ok) return [];
  return await res.json();
}

export async function getPublicCase(slug: string): Promise<any> {
  const res = await publicFetch(`${getApiBaseUrl()}/api/public/cases/${encodeURIComponent(slug)}`);
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error('Failed to fetch case');
  return await res.json();
}

export async function listPublicPromotions(): Promise<any[]> {
  const res = await publicFetch(`${getApiBaseUrl()}/api/public/promotions`);
  if (!res.ok) throw new Error('Failed to fetch promotions');
  return await res.json();
}

export async function listPublicBlogCategories(): Promise<Array<{ slug: string; name: string }>> {
  const res = await publicFetch(`${getApiBaseUrl()}/api/public/blog/categories`);
  if (!res.ok) throw new Error('Failed to fetch blog categories');
  return await res.json();
}

export async function validatePromoCode(promoCode: string): Promise<{ valid: boolean; promotion?: any; error?: string }> {
  const res = await publicFetch(`${getApiBaseUrl()}/api/promotions/validate-promo`, {
    method: 'POST',
    body: JSON.stringify({ promoCode }),
  });
  if (!res.ok) {
    const data = await res.json();
    return { valid: false, error: data.error || 'Ошибка проверки промокода' };
  }
  return await res.json();
}

export async function submitQuizForm(data: Record<string, any>): Promise<any> {
  const res = await publicFetch(`${getApiBaseUrl()}/api/forms/quiz-form/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Ошибка отправки формы');
  }
  
  return await res.json();
}

