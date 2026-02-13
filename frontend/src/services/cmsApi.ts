import { BlogPost, BlogPostCarouselItem, SeoData, SitePage, CaseItem, ProductItem, Form, FormSubmission, FormAbandonment, FormStats, SalesFunnel, FunnelStage, Deal, Task, TaskComment, Payment, DealDocument, Notification, TeamMember, CommercialProposal, ProposalSlide } from '@/types/cms';
import { readLocal, writeLocal } from '@/store/localStore';
import { setStoredCacheVersion } from '@/utils/cacheVersion';
import { getApiBase } from '@/utils/apiBase';

// Вычисляем динамически, а не один раз при загрузке модуля
function getApiBaseUrl(): string {
  return getApiBase();
}

import Cookies from 'js-cookie';

function getToken(): string | null {
  return Cookies.get('auth_token') || null;
}

function removeAuthToken(): void {
  Cookies.remove('auth_token');
}

function removeAuthUser(): void {
  localStorage.removeItem('auth_user');
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
  const response = await fetch(input, { ...(init || {}), headers });
  
// Глобальная обработка 401 - токен истек или невалиден
if (response.status === 401 && !input.includes('/api/public/') && !input.includes('/api/auth/')) {
  // Только для защищенных эндпоинтов - просто очищаем токен
  console.warn('[cmsApi] 401 Unauthorized - clearing auth token (no redirect)');
  try {
    removeAuthToken();
    removeAuthUser();
    // НЕ редиректим! Пусть роутер (App.tsx) сам решает что делать
  } catch (e) {
    console.error('[cmsApi] Error handling 401:', e);
  }
}


  
  return response;
}
const LS_BLOG_KEY = 'cms.blog.posts.v1';

function mapFromApi(row: any): SitePage {
  const seo: SeoData = {
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
  };
  return {
    id: row.slug || '',
    path: row.slug || '',
    title: row.title ?? '',
    html: row.body ?? '',
    seo,
    isPublished: Boolean(row.is_published),
    contentJson: row.content_json || {},
  } as SitePage & { contentJson?: any };
}

function mapToApi(update: Partial<SitePage>): any {
  const result: any = {};
  // Only include fields that are actually provided (not undefined)
  if (update.title !== undefined) result.title = update.title;
  if (update.html !== undefined) result.body = update.html;
  if ((update as any).isPublished !== undefined) result.is_published = (update as any).isPublished;
  if ((update as any).contentJson !== undefined) result.content_json = (update as any).contentJson;
  
  // SEO fields
  if (update.seo) {
    if (update.seo.metaTitle !== undefined) result.seo_title = update.seo.metaTitle;
    if (update.seo.metaDescription !== undefined) result.seo_description = update.seo.metaDescription;
    if (update.seo.metaKeywords !== undefined) result.seo_keywords = update.seo.metaKeywords;
    if (update.seo.canonicalUrl !== undefined) result.canonical_url = update.seo.canonicalUrl;
    if (update.seo.robotsIndex !== undefined) result.robots_index = update.seo.robotsIndex;
    if (update.seo.robotsFollow !== undefined) result.robots_follow = update.seo.robotsFollow;
    if (update.seo.ogTitle !== undefined) result.og_title = update.seo.ogTitle;
    if (update.seo.ogDescription !== undefined) result.og_description = update.seo.ogDescription;
    if (update.seo.ogImageUrl !== undefined) result.og_image_url = update.seo.ogImageUrl;
    if (update.seo.twitterCard !== undefined) result.twitter_card = update.seo.twitterCard;
    if (update.seo.twitterSite !== undefined) result.twitter_site = update.seo.twitterSite;
    if (update.seo.twitterCreator !== undefined) result.twitter_creator = update.seo.twitterCreator;
    if (update.seo.structuredDataJson !== undefined) {
      result.structured_data = update.seo.structuredDataJson 
        ? (update.seo.structuredDataJson.trim() ? JSON.parse(update.seo.structuredDataJson) : null)
        : null;
    }
    if (update.seo.hreflang !== undefined) result.hreflang = update.seo.hreflang;
  }
  
  return result;
}

export async function listSitePages(): Promise<SitePage[]> {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }
  const res = await doFetch(`${getApiBaseUrl()}/api/pages`);
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error('Failed to fetch pages');
  }
  const data = await res.json();
  return data.map(mapFromApi);
}

export async function getSitePage(id: string): Promise<SitePage | undefined> {
  const slug = id;
  const res = await doFetch(`${getApiBaseUrl()}/api/pages/${encodeURIComponent(slug)}`);
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error('Failed to fetch page');
  return mapFromApi(await res.json());
}

export async function updateSitePage(id: string, update: Partial<SitePage>): Promise<SitePage | undefined> {
  const slug = id;
  const res = await doFetch(`${getApiBaseUrl()}/api/pages/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mapToApi(update)),
  });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error('Failed to update page');
  const data = await res.json();
  return mapFromApi(data.updated);
}

export async function createSitePage(page: SitePage): Promise<SitePage> {
  const payload = {
    slug: page.path,
    title: page.title,
    body: page.html,
    seo_title: page.seo?.metaTitle,
    seo_description: page.seo?.metaDescription,
    seo_keywords: page.seo?.metaKeywords,
    is_published: (page as any).isPublished || false,
  };
  const res = await doFetch(`${getApiBaseUrl()}/api/pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create page');
  const created = await getSitePage(page.path);
  if (!created) throw new Error('Created page not found');
  return created;
}

export async function deleteSitePage(id: string): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/pages/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete page');
}

export async function publishPage(id: string, isPublished: boolean): Promise<SitePage | undefined> {
  const res = await doFetch(`${getApiBaseUrl()}/api/pages/${encodeURIComponent(id)}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_published: isPublished }),
  });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error('Failed to publish page');
  const data = await res.json();
  return mapFromApi(data.updated);
}

export async function movePage(id: string, newSlug: string): Promise<SitePage | undefined> {
  const res = await doFetch(`${getApiBaseUrl()}/api/pages/${encodeURIComponent(id)}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newSlug }),
  });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error('Failed to move page');
  const data = await res.json();
  return mapFromApi(data.updated);
}

export async function movePageToBlog(id: string, blogSlug?: string): Promise<{ blog_slug: string }> {
  const res = await doFetch(`${getApiBaseUrl()}/api/pages/${encodeURIComponent(id)}/move-to-blog`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: blogSlug }),
  });
  if (!res.ok) throw new Error('Failed to move page to blog');
  return res.json();
}

export async function movePageToCase(id: string, caseSlug?: string, extras?: { summary?: string; hero_image_url?: string; tools?: string[]; gallery?: string[]; metrics?: Record<string, number> }): Promise<{ case_slug: string }> {
  const res = await doFetch(`${getApiBaseUrl()}/api/pages/move-to-case`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page_slug: id, slug: caseSlug || id, ...(extras || {}) }),
  });
  if (!res.ok) throw new Error('Failed to move page to case');
  return res.json();
}

export async function movePageToProduct(id: string, product: { slug?: string; price_cents?: number; currency?: string; price_period?: 'one_time' | 'monthly' | 'yearly'; features?: string[]; sort_order?: number }): Promise<{ product_slug: string }> {
  const res = await doFetch(`${getApiBaseUrl()}/api/pages/move-to-product`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page_slug: id, slug: product?.slug || id, ...(product || {}) }),
  });
  if (!res.ok) throw new Error('Failed to move page to product');
  return res.json();
}

export async function undoLastPageMove(): Promise<{ restored_slug: string }> {
  const res = await doFetch(`${getApiBaseUrl()}/api/pages/undo-last-move`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to undo last move');
  return res.json();
}

// AI Semantics
export type SemanticKeyword = { q: string; ya: number; ga: number };
export type SemanticBuckets = { high: SemanticKeyword[]; medium: SemanticKeyword[]; low: SemanticKeyword[] };
export async function getSemanticKeywords(seed: string): Promise<SemanticBuckets> {
  const res = await fetch(`${getApiBaseUrl()}/api/ai/semantic?seed=${encodeURIComponent(seed)}`);
  if (!res.ok) throw new Error('Failed to fetch semantic keywords');
  return res.json();
}

// Semantic Topics API
export async function getSemanticTopics(): Promise<string[]> {
  const res = await doFetch(`${getApiBaseUrl()}/api/ai/semantic-topics`);
  if (!res.ok) throw new Error('Failed to fetch semantic topics');
  const data = await res.json();
  return data.topics || [];
}

export async function addSemanticTopic(topic: string): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/ai/semantic-topics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to add semantic topic' }));
    throw new Error(error.error || 'Failed to add semantic topic');
  }
}

export async function deleteSemanticTopic(topic: string): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/ai/semantic-topics/${encodeURIComponent(topic)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to delete semantic topic' }));
    throw new Error(error.error || 'Failed to delete semantic topic');
  }
}

export async function generateArticleFromKeyword(keyword: string, categorySlug?: string): Promise<{ slug: string; title: string }> {
  const res = await doFetch(`${getApiBaseUrl()}/api/ai/generate-article`, {
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify({ keyword, category_slug: categorySlug })
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Failed to generate article');
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: errorText || 'Failed to generate article' };
    }
    throw new Error(errorData.error || `Failed to generate article: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export interface SeoContent {
  title: string;
  html: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  summary: string;
  ogImageUrl: string;
  textLength: number;
}

export async function generateSeoContent(topic: string, currentTitle?: string, currentContent?: string): Promise<SeoContent> {
  const res = await doFetch(`${getApiBaseUrl()}/api/ai/generate-seo-content`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, currentTitle, currentContent }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to generate SEO content' }));
    throw new Error(error.error || 'Failed to generate SEO content');
  }
  return res.json();
}

export interface ProductSeoContent {
  descriptionHtml: string;
  summary: string;
  fullDescriptionHtml: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  tags: string[];
}

export interface ProductCardContent {
  title: string;
  summary: string;
  descriptionHtml: string;
  features: string[];
  suggestedPriceCents?: number;
  metaTitle: string;
  metaDescription: string;
  tags: string[];
}

export async function generateProductCard(
  productTopic: string,
  currentTitle?: string,
  currentDescription?: string,
  currentPrice?: number,
  currentFeatures?: string[]
): Promise<ProductCardContent> {
  const url = `${getApiBaseUrl()}/api/ai/generate-product-card`;
  const res = await doFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productTopic, currentTitle, currentDescription, currentPrice, currentFeatures }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to generate product card' }));
    console.error('[cmsApi] Generate product card failed:', res.status, error);
    throw new Error(error.error || 'Failed to generate product card');
  }
  const result = await res.json();
  return result;
}

export async function generateProductSeoContent(
  productTitle: string, 
  currentDescription?: string, 
  currentPrice?: number, 
  currentFeatures?: string[]
): Promise<ProductSeoContent> {
  const res = await doFetch(`${getApiBaseUrl()}/api/ai/generate-product-seo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productTitle, currentDescription, currentPrice, currentFeatures }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to generate product SEO content' }));
    throw new Error(error.error || 'Failed to generate product SEO content');
  }
  return res.json();
}

export async function getPartials(): Promise<{ head?: string; header?: string; footer?: string }> {
  const res = await doFetch(`${getApiBaseUrl()}/api/partials`);
  if (!res.ok) throw new Error('Failed to fetch partials');
  return res.json();
}

// Carousels API
export type Carousel = { slug: string; title: string };
export type CarouselSlide = { id?: number; kind: 'image' | 'text'; image_url?: string; caption_html?: string; width?: number; height?: number; link_url?: string; sort_order?: number; is_active?: boolean };

export async function listCarousels(): Promise<Carousel[]> {
  const res = await doFetch(`${getApiBaseUrl()}/api/carousels`);
  if (!res.ok) throw new Error('Failed to fetch carousels');
  return res.json();
}

// Metrics API
export type MetricsOverview = {
  visitors: Array<{ date: string; users: number }>;
  avgSessionSec: Array<{ date: string; seconds: number }>;
  topPages: Array<{ path: string; title: string; views: number }>;
  analyticsSource?: 'yandex' | 'ga' | 'internal' | 'error';
  stats?: {
    ordersTotal: number;
    revenueTotalCents: number;
    ordersMonth: number;
    revenueMonthCents: number;
    clientsTotal: number;
    clientsMonth: number;
    formSubmissionsTotal: number;
    formSubmissionsNew: number;
    productViewsMonth: number;
  };
};

export async function getMetricsOverview(): Promise<MetricsOverview> {
  const res = await doFetch(`${getApiBaseUrl()}/api/metrics/overview`);
  if (!res.ok) throw new Error('Failed to fetch metrics');
  return res.json();
}

export async function suggestSeo(payload: { slug?: string; title?: string; html?: string; type?: string; brandName?: string; siteUrl?: string; logoUrl?: string; lang?: string }): Promise<SeoData> {
  const res = await doFetch(`${getApiBaseUrl()}/api/seo/suggest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error('Failed to suggest SEO');
  return res.json();
}

export async function generateOgImageOnOwnDomain(payload: { title: string; logoUrl?: string; theme?: string; fontSize?: string }): Promise<{ url: string }> {
  const res = await doFetch(`${getApiBaseUrl()}/api/seo/og-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to generate OG image');
  return res.json();
}
export async function getCarousel(slug: string): Promise<{ slug: string; title: string; slides: CarouselSlide[] }> {
  const res = await doFetch(`${getApiBaseUrl()}/api/carousels/${encodeURIComponent(slug)}`);
  if (!res.ok) throw new Error('Failed to fetch carousel');
  return res.json();
}
export async function createCarousel(slug: string, title?: string): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/carousels`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, title }) });
  if (!res.ok) throw new Error('Failed to create carousel');
}
export async function upsertSlide(slug: string, slide: CarouselSlide & { id?: number }): Promise<void> {
  const url = slide.id ? `${getApiBaseUrl()}/api/carousels/${encodeURIComponent(slug)}/slides/${slide.id}` : `${getApiBaseUrl()}/api/carousels/${encodeURIComponent(slug)}/slides`;
  const method = slide.id ? 'PUT' : 'POST';
  const res = await doFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(slide) });
  if (!res.ok) throw new Error('Failed to save slide');
}
export async function deleteSlide(slug: string, id: number): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/carousels/${encodeURIComponent(slug)}/slides/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete slide');
}
export async function reorderSlides(slug: string, order: Array<{ id: number; sort_order: number }>): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/carousels/${encodeURIComponent(slug)}/reorder`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order }) });
  if (!res.ok) throw new Error('Failed to reorder slides');
}

// Blog remains local until backend endpoints are defined
function mapBlogFromApi(row: any): BlogPost {
  const seo: SeoData = {
    metaTitle: row.seo_title || undefined,
    metaDescription: row.seo_description || undefined,
    metaKeywords: Array.isArray(row.seo_keywords) ? row.seo_keywords : undefined,
  };
  const rawCarousel = row.carousel_items || row.carouselItems;
  let carouselItems: BlogPostCarouselItem[] | undefined;
  if (Array.isArray(rawCarousel)) {
    const mapped = rawCarousel
      .map((item: any) => {
        if (!item) return null;
        const imageUrl = item.imageUrl || item.image_url || '';
        if (!imageUrl || typeof imageUrl !== 'string') return null;
        return {
          imageUrl,
          caption: item.caption ?? item.caption_html ?? undefined,
          alt: item.alt ?? item.alt_text ?? undefined,
          linkUrl: item.linkUrl ?? item.link_url ?? undefined,
        };
      })
      .filter(Boolean) as BlogPostCarouselItem[];
    if (mapped.length > 0) {
      carouselItems = mapped;
    }
  } else if (typeof rawCarousel === 'string') {
    try {
      const parsed = JSON.parse(rawCarousel);
      if (Array.isArray(parsed)) {
        const mapped = parsed
          .map((item: any) => {
            if (!item) return null;
            const imageUrl = item.imageUrl || item.image_url || '';
            if (!imageUrl || typeof imageUrl !== 'string') return null;
            return {
              imageUrl,
              caption: item.caption ?? item.caption_html ?? undefined,
              alt: item.alt ?? item.alt_text ?? undefined,
              linkUrl: item.linkUrl ?? item.link_url ?? undefined,
            };
          })
          .filter(Boolean) as BlogPostCarouselItem[];
        if (mapped.length > 0) {
          carouselItems = mapped;
        }
      }
    } catch {
      // ignore parse errors
    }
  }
  return {
    id: row.slug || '',
    slug: row.slug || '',
    title: row.title ?? '',
    contentHtml: row.body ?? '',
    seo,
    publishedAt: row.created_at,
    isPublished: Boolean(row.is_published),
    categorySlug: row.category_slug || undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    isFeatured: Boolean(row.is_featured),
    coverImageUrl: typeof row.cover_image_url === 'string' && row.cover_image_url.trim() ? row.cover_image_url : undefined,
    carouselEnabled: Boolean(row.carousel_enabled),
    carouselTitle: typeof row.carousel_title === 'string' && row.carousel_title.trim() ? row.carousel_title : undefined,
    carouselItems,
    contentJson: row.content_json || {},
  } as BlogPost & { contentJson?: any };
}

export async function listBlogPosts(): Promise<BlogPost[]> {
  const res = await doFetch(`${getApiBaseUrl()}/api/blog`);
  if (!res.ok) throw new Error('Failed to fetch blog posts');
  const data = await res.json();
  return data.map(mapBlogFromApi);
}
export async function getBlogPost(id: string): Promise<BlogPost | undefined> {
  const res = await doFetch(`${getApiBaseUrl()}/api/blog/${encodeURIComponent(id)}`);
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error('Failed to fetch blog post');
  return mapBlogFromApi(await res.json());
}
export async function upsertBlogPost(post: BlogPost): Promise<BlogPost> {
  const payload: any = {
    slug: post.slug,
  };
  
  // Для PUT запросов отправляем только те поля, которые явно заданы и не пустые
  // Для POST запросов все поля обязательны
  if (post.slug) {
    // PUT - только обновляем переданные поля
    // title отправляем только если оно не пустое (не обновляем title, если оно пустое)
    if (post.title !== undefined && post.title !== null && post.title.trim() !== '') {
      payload.title = post.title;
    }
    if (post.contentHtml !== undefined && post.contentHtml !== null) payload.body = post.contentHtml;
    if (post.seo?.metaTitle !== undefined && post.seo.metaTitle !== null) payload.seo_title = post.seo.metaTitle;
    if (post.seo?.metaDescription !== undefined && post.seo.metaDescription !== null) payload.seo_description = post.seo.metaDescription;
    if (post.seo?.metaKeywords !== undefined && post.seo.metaKeywords !== null) payload.seo_keywords = post.seo.metaKeywords;
    if (post.isPublished !== undefined && post.isPublished !== null) payload.is_published = post.isPublished;
    if (post.isFeatured !== undefined && post.isFeatured !== null) payload.is_featured = post.isFeatured;
    if (post.categorySlug !== undefined && post.categorySlug !== null) payload.category_slug = post.categorySlug;
    if (post.tags !== undefined) payload.tags = post.tags || [];
    // coverImageUrl отправляем всегда (даже если null), чтобы бэкенд мог обновить поле
    // null означает удалить обложку, строка - установить новую
    if (post.coverImageUrl !== undefined) {
      payload.cover_image_url = typeof post.coverImageUrl === 'string' && post.coverImageUrl.trim() 
        ? post.coverImageUrl.trim() 
        : null;
    }
    if (post.carouselEnabled !== undefined) payload.carousel_enabled = post.carouselEnabled;
    if (post.carouselTitle !== undefined) payload.carousel_title = post.carouselTitle?.trim() || null;
    if (post.carouselItems !== undefined) {
      payload.carousel_items = (post.carouselItems || [])
        .map((item) => ({
          image_url: item.imageUrl?.trim(),
          caption: item.caption?.trim() || null,
          alt: item.alt?.trim() || null,
          link_url: item.linkUrl?.trim() || null,
        }))
        .filter((item) => item.image_url);
    }
    if ((post as any).contentJson !== undefined) {
      payload.content_json = (post as any).contentJson;
    }
  } else {
    // POST - создание новой статьи
    if ((post as any).desiredSlug) {
      payload.slug = (post as any).desiredSlug;
    }
    payload.title = post.title || '';
    payload.body = post.contentHtml || '';
    payload.seo_title = post.seo?.metaTitle;
    payload.seo_description = post.seo?.metaDescription;
    payload.seo_keywords = post.seo?.metaKeywords;
    payload.is_published = post.isPublished || false;
    payload.is_featured = post.isFeatured || false;
    payload.category_slug = post.categorySlug;
    payload.tags = post.tags || [];
    payload.cover_image_url = typeof post.coverImageUrl === 'string' && post.coverImageUrl.trim() 
      ? post.coverImageUrl.trim() 
      : null;
    payload.carousel_enabled = post.carouselEnabled || false;
    payload.carousel_title = post.carouselTitle?.trim() || null;
      payload.carousel_items = (post.carouselItems || [])
        .map((item) => ({
          image_url: item.imageUrl?.trim(),
          caption: item.caption?.trim() || null,
          alt: item.alt?.trim() || null,
          link_url: item.linkUrl?.trim() || null,
        }))
        .filter((item) => item.image_url);
    if ((post as any).contentJson !== undefined) {
      payload.content_json = (post as any).contentJson;
    }
  }
  
  const method = post.slug ? 'PUT' : 'POST';
  const url = post.slug ? `${getApiBaseUrl()}/api/blog/${encodeURIComponent(post.slug)}` : `${getApiBaseUrl()}/api/blog`;
  const res = await doFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to save blog post: ${errorText}`);
  }
  
  // Для PUT запросов загружаем обновленную статью
  if (post.slug) {
    const saved = await getBlogPost(post.slug);
    return saved || { ...post };
  } else {
    // POST - бэкенд возвращает созданную статью
    const savedData = await res.json();
    if (savedData && savedData.slug) {
      return mapBlogFromApi(savedData);
    }
    // Если бэкенд не вернул данные, загружаем по slug из payload
    if (payload.slug) {
      const saved = await getBlogPost(payload.slug);
      return saved || { ...post };
    }
    return { ...post };
  }
}

export async function listBlogCategories(): Promise<Array<{ slug: string; name: string }>> {
  const res = await doFetch(`${getApiBaseUrl()}/api/blog/categories`);
  if (!res.ok) throw new Error('Failed to fetch blog categories');
  return res.json();
}

export async function createBlogCategory(slug: string, name?: string): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/blog/categories`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, name }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Failed to create blog category' }));
    throw new Error(errorData.error || `Failed to create blog category: ${res.status} ${res.statusText}`);
  }
}

export async function deleteBlogCategory(slug: string): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/blog/categories/${encodeURIComponent(slug)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete blog category');
}
export async function deleteBlogPost(id: string): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/blog/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete blog post');
}

export async function setBlogPublished(slug: string, isPublished: boolean): Promise<BlogPost | undefined> {
  const res = await doFetch(`${getApiBaseUrl()}/api/blog/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_published: isPublished }),
  });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error('Failed to publish blog post');
  const data = await res.json();
  return mapBlogFromApi(data.updated);
}

export async function getSeoOverrides(): Promise<Record<string, SeoData>> {
  // Compose from pages until separate SEO store is needed
  const pages = await listSitePages();
  const map = Object.fromEntries(
    pages.map((p) => [p.id, p.seo])
  );
  return map;
}
export async function setSeoOverrides(overrides: Record<string, SeoData>): Promise<void> {
  // Push to pages individually
  await Promise.all(
    Object.entries(overrides).map(async ([id, seo]) => {
      // Convert string values to proper types
      const normalizedSeo: SeoData = {
        ...seo,
        robotsIndex: typeof seo.robotsIndex === 'string' ? seo.robotsIndex === 'true' : seo.robotsIndex,
        robotsFollow: typeof seo.robotsFollow === 'string' ? seo.robotsFollow === 'true' : seo.robotsFollow,
      };
      await updateSitePage(id, { seo: normalizedSeo });
    })
  );
}

// Images API
export async function uploadImage(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append('image', file);
  
  // Для FormData не используем doFetch, так как нужно чтобы браузер сам установил Content-Type с boundary
  const token = getToken();
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // НЕ устанавливаем Content-Type - браузер сам установит с boundary для FormData
  
  const res = await fetch(`${getApiBaseUrl()}/api/images`, {
    method: 'POST',
    headers,
    body: form,
  });
  
  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Failed to upload image');
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: errorText || 'Failed to upload image' };
    }
    throw new Error(errorData.error || `Upload failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// Cases API
export async function listCases(): Promise<CaseItem[]> {
  const res = await doFetch(`${getApiBaseUrl()}/api/cases`);
  if (!res.ok) throw new Error('Failed to fetch cases');
  const data = await res.json();
  return data.map((r: any) => ({
    slug: r.slug,
    title: r.title,
    summary: r.summary || '',
    contentHtml: r.contentHtml || r.content_html || '',
    heroImageUrl: r.heroImageUrl || r.hero_image_url || '',
    gallery: Array.isArray(r.gallery) ? r.gallery : [],
    metrics: r.metrics || {},
    tools: Array.isArray(r.tools) ? r.tools : [],
    templateType: r.templateType || r.template_type,
    isTemplate: r.isTemplate || r.is_template || false,
    contentJson: r.contentJson || r.content_json || {},
    isPublished: !!r.is_published,
  }));
}
export async function getCase(slug: string): Promise<CaseItem | undefined> {
  const res = await doFetch(`${getApiBaseUrl()}/api/cases/${encodeURIComponent(slug)}`);
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error('Failed to fetch case');
  const r = await res.json();
  return {
    slug: r.slug,
    title: r.title,
    summary: r.summary || '',
    contentHtml: r.contentHtml || r.content_html || '',
    heroImageUrl: r.heroImageUrl || r.hero_image_url || '',
    templateType: r.templateType || r.template_type,
    isTemplate: r.isTemplate || r.is_template || false,
    gallery: Array.isArray(r.gallery) ? r.gallery : [],
    metrics: r.metrics || {},
    tools: Array.isArray(r.tools) ? r.tools : [],
    contentJson: r.contentJson || r.content_json || {},
    isPublished: !!r.is_published,
  };
}
export async function setCasePublished(slug: string, isPublished: boolean): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/cases/${encodeURIComponent(slug)}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_published: isPublished }),
  });
  if (!res.ok) throw new Error('Failed to publish case');
}

export async function upsertCase(item: CaseItem): Promise<void> {
  const payload: any = {
    slug: item.slug,
    title: item.title,
    summary: item.summary,
    contentHtml: item.contentHtml,
    heroImageUrl: item.heroImageUrl,
    gallery: item.gallery || [],
    metrics: item.metrics || {},
    tools: item.tools || [],
    contentJson: item.contentJson || {},
    templateType: item.templateType,
    isTemplate: item.isTemplate,
    // Передаем оба варианта для совместимости с бэкендом
    isPublished: !!item.isPublished,
    is_published: !!item.isPublished,
  };
  // Добавляем category если она есть (даже если null, чтобы сбросить значение)
  if ('category' in item) {
    payload.category = item.category || null;
  }
  const url = `${getApiBaseUrl()}/api/cases${item.slug ? `/${encodeURIComponent(item.slug)}` : ''}`;
  const method = item.slug ? 'PUT' : 'POST';
  const res = await doFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error('Failed to save case');
}
export async function deleteCase(slug: string): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/cases/${encodeURIComponent(slug)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete case');
}
// Products API
export async function listProducts(activeOnly = false): Promise<ProductItem[]> {
  const url = activeOnly ? `${getApiBaseUrl()}/api/products?active=true` : `${getApiBaseUrl()}/api/products`;
  const res = await doFetch(url);
  if (!res.ok) throw new Error('Failed to fetch products');
  const products = await res.json();
  return products.map((p: any) => ({
    slug: p.slug,
    title: p.title,
    descriptionHtml: p.descriptionHtml || '',
    priceCents: p.priceCents || 0,
    currency: p.currency || 'RUB',
    pricePeriod: p.pricePeriod || 'one_time',
    features: Array.isArray(p.features) ? p.features : [],
    tags: Array.isArray(p.tags) ? p.tags : [],
    isActive: !!p.isActive,
    sortOrder: p.sortOrder || 0,
    contentJson: p.contentJson || undefined,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
}
export async function getProduct(slug: string): Promise<ProductItem | undefined> {
  const res = await doFetch(`${getApiBaseUrl()}/api/products/${encodeURIComponent(slug)}`);
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error('Failed to fetch product');
  const r = await res.json();
  return {
    slug: r.slug,
    title: r.title,
    descriptionHtml: r.descriptionHtml || '',
    summary: r.summary ?? '',
    fullDescriptionHtml: r.fullDescriptionHtml ?? '',
    priceCents: r.priceCents || 0,
    currency: r.currency || 'RUB',
    pricePeriod: r.pricePeriod || 'one_time',
    features: Array.isArray(r.features) ? r.features : [],
    tags: Array.isArray(r.tags) ? r.tags : [],
    isActive: !!r.isActive,
    sortOrder: r.sortOrder || 0,
    contentJson: r.contentJson || undefined,
    categoryId: r.categoryId ?? undefined,
    imageUrl: r.imageUrl ?? '',
    gallery: Array.isArray(r.gallery) ? r.gallery : [],
    metaTitle: r.metaTitle ?? '',
    metaDescription: r.metaDescription ?? '',
    metaKeywords: r.metaKeywords ?? '',
    caseSlugs: Array.isArray(r.caseSlugs) ? r.caseSlugs : [],
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}
export async function upsertProduct(item: ProductItem): Promise<void> {
  const payload: any = {
    slug: item.slug,
    title: item.title,
    descriptionHtml: item.descriptionHtml,
    priceCents: item.priceCents,
    currency: item.currency,
    pricePeriod: item.pricePeriod,
    features: item.features || [],
    isActive: item.isActive !== false,
    sortOrder: item.sortOrder || 0,
    contentJson: item.contentJson || undefined,
  };
  
  // Добавляем новые поля для интернет-магазина
  if (item.categoryId !== undefined) payload.categoryId = item.categoryId;
  if (item.imageUrl !== undefined) payload.imageUrl = item.imageUrl;
  if (item.gallery !== undefined) payload.gallery = item.gallery;
  if (item.tags !== undefined) payload.tags = item.tags;
  if (item.stockQuantity !== undefined) payload.stockQuantity = item.stockQuantity;
  if (item.sku !== undefined) payload.sku = item.sku;
  
  // Добавляем meta поля
  if (item.summary !== undefined) payload.summary = item.summary;
  if (item.fullDescriptionHtml !== undefined) payload.fullDescriptionHtml = item.fullDescriptionHtml;
  if (item.metaTitle !== undefined) payload.metaTitle = item.metaTitle;
  if (item.metaDescription !== undefined) payload.metaDescription = item.metaDescription;
  if (item.metaKeywords !== undefined) payload.metaKeywords = item.metaKeywords;
  if (item.caseSlugs !== undefined) payload.caseSlugs = item.caseSlugs;
  
  
  const url = `${getApiBaseUrl()}/api/products${item.slug ? `/${encodeURIComponent(item.slug)}` : ''}`;
  const method = item.slug ? 'PUT' : 'POST';
  
  const res = await doFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) {
    const errorText = await res.text();
    console.error('[upsertProduct] Error:', res.status, errorText);
    throw new Error('Failed to save product');
  }
  
}
export async function deleteProduct(slug: string): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/products/${encodeURIComponent(slug)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete product');
}

// Team Members API
export async function listTeamMembers(activeOnly?: boolean): Promise<TeamMember[]> {
  const url = `${getApiBaseUrl()}/api/team${activeOnly ? '?active=true' : ''}`;
  const res = await doFetch(url);
  if (!res.ok) throw new Error('Failed to fetch team members');
  return await res.json();
}

export async function getPublicTeamMembers(): Promise<TeamMember[]> {
  const res = await doFetch(`${getApiBaseUrl()}/api/team/public`);
  if (!res.ok) throw new Error('Failed to fetch public team members');
  return await res.json();
}

export async function getTeamMember(id: number): Promise<TeamMember> {
  const res = await doFetch(`${getApiBaseUrl()}/api/team/${id}`);
  if (!res.ok) throw new Error('Failed to fetch team member');
  return await res.json();
}

export async function createTeamMember(member: Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'>): Promise<TeamMember> {
  const res = await doFetch(`${getApiBaseUrl()}/api/team`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(member),
  });
  if (!res.ok) throw new Error('Failed to create team member');
  const data = await res.json();
  return data.created;
}

export async function updateTeamMember(id: number, member: Partial<TeamMember>): Promise<TeamMember> {
  const res = await doFetch(`${getApiBaseUrl()}/api/team/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(member),
  });
  if (!res.ok) throw new Error('Failed to update team member');
  const data = await res.json();
  return data.updated;
}

export async function deleteTeamMember(id: number): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/team/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete team member');
}

export async function reorderTeamMembers(items: Array<{ id: number; sortOrder: number }>): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/team/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error('Failed to reorder team members');
}

export async function reorderProducts(items: Array<{ slug: string; sortOrder: number }>): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/products/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error('Failed to reorder products');
}

export async function clearGlobalCache(reason?: string): Promise<{ ok: boolean; version: string }> {
  const payload = reason ? { reason } : {};
  const res = await doFetch(`${getApiBaseUrl()}/api/cache/clear`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Failed to clear cache');
  }
  const data = await res.json();
  if (data?.version) {
    setStoredCacheVersion(String(data.version));
  }
  return data;
}

// Forms API
export async function listForms(): Promise<Form[]> {
  const res = await doFetch(`${getApiBaseUrl()}/api/forms`);
  if (!res.ok) throw new Error('Failed to fetch forms');
  const data = await res.json();
  return data.map((r: any) => ({
    id: r.id,
    form_id: r.form_id,
    form_name: r.form_name,
    page_path: r.page_path,
    fields: Array.isArray(r.fields) ? r.fields : [],
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export async function getForm(formId: string): Promise<Form | undefined> {
  const res = await doFetch(`${getApiBaseUrl()}/api/forms/${encodeURIComponent(formId)}`);
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error('Failed to fetch form');
  const r = await res.json();
  return {
    id: r.id,
    form_id: r.form_id,
    form_name: r.form_name,
    page_path: r.page_path,
    fields: Array.isArray(r.fields) ? r.fields : [],
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export async function upsertForm(form: Form): Promise<void> {
  const payload = {
    form_id: form.form_id,
    form_name: form.form_name,
    page_path: form.page_path,
    fields: form.fields || [],
  };
  const url = `${getApiBaseUrl()}/api/forms${form.form_id ? `/${encodeURIComponent(form.form_id)}` : ''}`;
  const method = form.form_id ? 'PUT' : 'POST';
  const res = await doFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error('Failed to save form');
}

export async function deleteForm(formId: string): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/forms/${encodeURIComponent(formId)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete form');
}

export async function listFormSubmissions(formId: string, status?: string): Promise<FormSubmission[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  const res = await doFetch(`${getApiBaseUrl()}/api/forms/${encodeURIComponent(formId)}/submissions?${params}`);
  if (!res.ok) throw new Error('Failed to fetch submissions');
  const data = await res.json();
  return data.map((r: any) => ({
    id: r.id,
    form_id: r.form_id,
    form_data: typeof r.form_data === 'object' ? r.form_data : (r.form_data ? JSON.parse(r.form_data) : {}),
    status: r.status || 'new',
    ip_address: r.ip_address,
    user_agent: r.user_agent,
    referrer: r.referrer,
    submitted_at: r.submitted_at,
    read_at: r.read_at,
    replied_at: r.replied_at,
  }));
}

export async function getFormSubmission(formId: string, submissionId: number): Promise<FormSubmission | undefined> {
  const res = await doFetch(`${getApiBaseUrl()}/api/forms/${encodeURIComponent(formId)}/submissions/${submissionId}`);
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error('Failed to fetch submission');
  const r = await res.json();
  return {
    id: r.id,
    form_id: r.form_id,
    form_data: typeof r.form_data === 'object' ? r.form_data : (r.form_data ? JSON.parse(r.form_data) : {}),
    status: r.status || 'new',
    ip_address: r.ip_address,
    user_agent: r.user_agent,
    referrer: r.referrer,
    submitted_at: r.submitted_at,
    read_at: r.read_at,
    replied_at: r.replied_at,
  };
}

export async function updateSubmissionStatus(formId: string, submissionId: number, status: 'new' | 'read' | 'replied' | 'archived'): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/forms/${encodeURIComponent(formId)}/submissions/${submissionId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update submission status');
}

export async function deleteSubmission(formId: string, submissionId: number): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/forms/${encodeURIComponent(formId)}/submissions/${submissionId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete submission');
}

export async function listFormAbandonments(formId: string): Promise<FormAbandonment[]> {
  const res = await doFetch(`${getApiBaseUrl()}/api/forms/${encodeURIComponent(formId)}/abandonments`);
  if (!res.ok) throw new Error('Failed to fetch abandonments');
  const data = await res.json();
  return data.map((r: any) => ({
    id: r.id,
    form_id: r.form_id,
    form_data: typeof r.form_data === 'object' ? r.form_data : (r.form_data ? JSON.parse(r.form_data) : {}),
    started_at: r.started_at,
    abandoned_at: r.abandoned_at,
    ip_address: r.ip_address,
    user_agent: r.user_agent,
    referrer: r.referrer,
  }));
}

export async function getFormStats(): Promise<FormStats> {
  const res = await doFetch(`${getApiBaseUrl()}/api/forms/stats/overview`);
  if (!res.ok) throw new Error('Failed to fetch form stats');
  return await res.json();
}

// Public form submission (no auth required)
export async function submitForm(formId: string, formData: Record<string, any>): Promise<{ success: boolean; submission: FormSubmission }> {
  const res = await fetch(`${getApiBaseUrl()}/api/forms/${encodeURIComponent(formId)}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });
  if (!res.ok) throw new Error('Failed to submit form');
  const data = await res.json();
  return {
    success: data.success,
    submission: {
      id: data.submission.id,
      form_id: data.submission.form_id,
      form_data: typeof data.submission.form_data === 'object' ? data.submission.form_data : JSON.parse(data.submission.form_data),
      status: data.submission.status || 'new',
      ip_address: data.submission.ip_address,
      user_agent: data.submission.user_agent,
      referrer: data.submission.referrer,
      submitted_at: data.submission.submitted_at,
    },
  };
}

// Public form abandonment tracking (no auth required)
export async function trackFormAbandonment(formId: string, formData: Record<string, any>, startedAt: string): Promise<void> {
  await fetch(`${getApiBaseUrl()}/api/forms/${encodeURIComponent(formId)}/abandon`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ form_data: formData, started_at: startedAt }),
  });
}

// Funnels API
export async function listFunnels(): Promise<SalesFunnel[]> {
  const res = await doFetch(`${getApiBaseUrl()}/api/funnels`);
  if (!res.ok) throw new Error('Failed to fetch funnels');
  return await res.json();
}

export async function getFunnel(funnelId: number): Promise<SalesFunnel & { stages: FunnelStage[] }> {
  const res = await doFetch(`${getApiBaseUrl()}/api/funnels/${funnelId}`);
  if (!res.ok) throw new Error('Failed to fetch funnel');
  return await res.json();
}

export async function upsertFunnel(funnel: Partial<SalesFunnel>): Promise<SalesFunnel> {
  const url = funnel.id ? `${getApiBaseUrl()}/api/funnels/${funnel.id}` : `${getApiBaseUrl()}/api/funnels`;
  const method = funnel.id ? 'PUT' : 'POST';
  const res = await doFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: funnel.name,
      description: funnel.description,
      isActive: funnel.isActive !== false,
      sortOrder: funnel.sortOrder || 0,
    }),
  });
  if (!res.ok) throw new Error('Failed to save funnel');
  return await res.json();
}

export async function deleteFunnel(funnelId: number): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/funnels/${funnelId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete funnel');
}

export async function upsertFunnelStage(funnelId: number, stage: Partial<FunnelStage>): Promise<FunnelStage> {
  const url = stage.id
    ? `${getApiBaseUrl()}/api/funnels/${funnelId}/stages/${stage.id}`
    : `${getApiBaseUrl()}/api/funnels/${funnelId}/stages`;
  const method = stage.id ? 'PUT' : 'POST';
  const res = await doFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: stage.name,
      color: stage.color || '#1976d2',
      sortOrder: stage.sortOrder || 0,
      probability: stage.probability || 0,
    }),
  });
  if (!res.ok) throw new Error('Failed to save stage');
  return await res.json();
}

export async function deleteFunnelStage(funnelId: number, stageId: number): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/funnels/${funnelId}/stages/${stageId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete stage');
}

export async function reorderFunnelStages(funnelId: number, stageIds: number[]): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/funnels/${funnelId}/stages/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stageIds }),
  });
  if (!res.ok) throw new Error('Failed to reorder stages');
}

// Deals API
export async function listDeals(funnelId: number): Promise<Deal[]> {
  const res = await doFetch(`${getApiBaseUrl()}/api/funnels/${funnelId}/deals`);
  if (!res.ok) throw new Error('Failed to fetch deals');
  return await res.json();
}

export async function getDeal(funnelId: number, dealId: number): Promise<Deal> {
  const res = await doFetch(`${getApiBaseUrl()}/api/funnels/${funnelId}/deals/${dealId}`);
  if (!res.ok) throw new Error('Failed to fetch deal');
  return await res.json();
}

export async function upsertDeal(funnelId: number, deal: Partial<Deal>): Promise<Deal> {
  const isUpdate = deal.id && deal.id > 0;
  const url = isUpdate
    ? `${getApiBaseUrl()}/api/funnels/${funnelId}/deals/${deal.id}`
    : `${getApiBaseUrl()}/api/funnels/${funnelId}/deals`;
  const method = isUpdate ? 'PUT' : 'POST';
  // Remove id from body when creating new deal
  const body = isUpdate ? deal : { ...deal, id: undefined };
  const res = await doFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to save deal');
  return await res.json();
}

export async function deleteDeal(funnelId: number, dealId: number): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/funnels/${funnelId}/deals/${dealId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete deal');
}

// Tasks API
export async function listTasks(params?: { status?: string; priority?: string; assignedTo?: number; dealId?: number; archived?: boolean; category?: string }): Promise<Task[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.priority) searchParams.set('priority', params.priority);
  if (params?.assignedTo) searchParams.set('assignedTo', String(params.assignedTo));
  if (params?.dealId) searchParams.set('dealId', String(params.dealId));
  if (params?.archived !== undefined) searchParams.set('archived', String(params.archived));
  if (params?.category) searchParams.set('category', params.category);
  const res = await doFetch(`${getApiBaseUrl()}/api/tasks?${searchParams}`);
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return await res.json();
}

export async function getTask(taskId: number): Promise<Task & { comments?: TaskComment[] }> {
  const res = await doFetch(`${getApiBaseUrl()}/api/tasks/${taskId}`);
  if (!res.ok) throw new Error('Failed to fetch task');
  return await res.json();
}

export async function upsertTask(task: Partial<Task>): Promise<Task> {
  const url = (task.id && task.id > 0) ? `${getApiBaseUrl()}/api/tasks/${task.id}` : `${getApiBaseUrl()}/api/tasks`;
  const method = (task.id && task.id > 0) ? 'PUT' : 'POST';
  const res = await doFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  });
  if (!res.ok) throw new Error('Failed to save task');
  return await res.json();
}

export async function deleteTask(taskId: number): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/tasks/${taskId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete task');
}

export async function applyTaskTemplateToDeal(funnelId: number, dealId: number, productSlug: string, productTitle?: string): Promise<{ success: boolean; tasksCreated: number }> {
  const res = await doFetch(`${getApiBaseUrl()}/api/funnels/apply-task-template`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ funnelId, dealId, productSlug, productTitle }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Не удалось применить шаблон задач');
  }
  return await res.json();
}

export async function addTaskComment(taskId: number, comment: string): Promise<TaskComment> {
  const res = await doFetch(`${getApiBaseUrl()}/api/tasks/${taskId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment }),
  });
  if (!res.ok) throw new Error('Failed to add comment');
  return await res.json();
}

export async function deleteTaskComment(taskId: number, commentId: number): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/tasks/${taskId}/comments/${commentId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete comment');
}

export interface TaskStats {
  total: {
    total: string;
    new_count: string;
    in_progress_count: string;
    completed_count: string;
    cancelled_count: string;
    overdue_count: string;
    urgent_count: string;
    high_count: string;
    medium_count: string;
    low_count: string;
  };
  dailyStats: Array<{ date: string; created: string; completed: string }>;
  avgCompletionDays: number;
  priorityStatusStats: Array<{ priority: string; status: string; count: string }>;
  weeklyStats: Array<{ day_of_week: number; count: string }>;
  hourlyStats: Array<{ hour: number; count: string }>;
  completionTrend: Array<{ date: string; completed: string }>;
  workloadByDate: Array<{ date: string; tasks_due: string }>;
  productivity: Array<{ week: string; completed: string }>;
  categoryStats: Array<{ category: string; total: string; completed: string; in_progress: string; overdue: string }>;
}

export interface RecommendationTask {
  title: string;
  description: string;
  category: 'development' | 'marketing' | 'business' | 'operations' | 'support' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface AIRecommendation {
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  tasks?: RecommendationTask[];
  action?: string; // Для обратной совместимости
}

export interface SuggestedTask {
  title: string;
  description: string;
  category: 'development' | 'marketing' | 'business' | 'operations' | 'support' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reason: string;
}

export async function getAITaskRecommendations(): Promise<{ recommendations: AIRecommendation[]; suggestedTasks: SuggestedTask[] }> {
  try {
    const res = await doFetch(`${getApiBaseUrl()}/api/tasks/ai-recommendations`);
    if (!res.ok) {
      const errorText = await res.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || `HTTP ${res.status}` };
      }
      console.error('[getAITaskRecommendations] Error response:', errorData);
      return { recommendations: [], suggestedTasks: [] };
    }
    const data = await res.json();
    return { 
      recommendations: data.recommendations || [], 
      suggestedTasks: data.suggestedTasks || [] 
    };
  } catch (err: any) {
    console.error('[getAITaskRecommendations] Exception:', err);
    return { recommendations: [], suggestedTasks: [] };
  }
}

export async function getTaskStats(days?: number): Promise<TaskStats> {
  try {
    const searchParams = new URLSearchParams();
    if (days) searchParams.set('days', String(days));
    const url = `${getApiBaseUrl()}/api/tasks/stats?${searchParams}`;
    const res = await doFetch(url);
    
    if (!res.ok) {
      const errorText = await res.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || `HTTP ${res.status}` };
      }
      console.error('[getTaskStats] Error response:', errorData);
      console.error('[getTaskStats] Status:', res.status);
      console.error('[getTaskStats] URL:', url);
      throw new Error(errorData.error || `Failed to fetch task statistics: ${res.status}`);
    }
    
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('[getTaskStats] Exception:', err);
    throw err;
  }
}

// Task Executor API
export interface PendingTask {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  tags?: string[];
  createdAt?: string;
}

export async function getNextTaskToExecute(): Promise<{ task: PendingTask | null; message: string }> {
  const res = await doFetch(`${getApiBaseUrl()}/api/task-executor/execute-next`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to get next task');
  return await res.json();
}

export async function getPendingTasks(): Promise<PendingTask[]> {
  const res = await doFetch(`${getApiBaseUrl()}/api/task-executor/pending`);
  if (!res.ok) throw new Error('Failed to fetch pending tasks');
  return await res.json();
}

export async function completeTask(taskId: number, notes?: string): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/task-executor/complete/${taskId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
  if (!res.ok) throw new Error('Failed to complete task');
}

export async function failTask(taskId: number, reason?: string): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/task-executor/fail/${taskId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error('Failed to fail task');
}

// Promotions API
export interface PromotionItem {
  id?: number;
  title: string;
  description: string;
  expiryDate?: string | null;
  expiryText?: string | null;
  buttonText: string;
  formId?: string | null;
  isActive: boolean;
  sortOrder: number;
  promoCode?: string | null;
  hiddenLocation?: string | null;
  discountPercent?: number;
  discountAmount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export async function listPromotions(): Promise<PromotionItem[]> {
  const res = await doFetch(`${getApiBaseUrl()}/api/promotions`);
  if (!res.ok) throw new Error('Failed to fetch promotions');
  return await res.json();
}

export async function getPromotion(id: number): Promise<PromotionItem | undefined> {
  const res = await doFetch(`${getApiBaseUrl()}/api/promotions/${id}`);
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error('Failed to fetch promotion');
  return await res.json();
}

export async function validatePromoCode(promoCode: string): Promise<{ valid: boolean; promotion?: any; error?: string }> {
  const res = await doFetch(`${getApiBaseUrl()}/api/promotions/validate-promo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ promoCode }),
  });
  if (!res.ok) {
    const data = await res.json();
    return { valid: false, error: data.error || 'Ошибка проверки промокода' };
  }
  return await res.json();
}

export async function upsertPromotion(item: PromotionItem): Promise<void> {
  const payload = {
    title: item.title,
    description: item.description,
    expiryDate: item.expiryDate || null,
    expiryText: item.expiryText || null,
    buttonText: item.buttonText || 'Получить скидку',
    formId: item.formId || null,
    isActive: item.isActive ?? true,
    sortOrder: item.sortOrder || 0,
    promoCode: item.promoCode || null,
    hiddenLocation: item.hiddenLocation || null,
    discountPercent: item.discountPercent || 0,
    discountAmount: item.discountAmount || 0,
  };

  const url = item.id
    ? `${getApiBaseUrl()}/api/promotions/${item.id}`
    : `${getApiBaseUrl()}/api/promotions`;
  const method = item.id ? 'PUT' : 'POST';

  const res = await doFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error('Failed to save promotion');
}

export async function deletePromotion(id: number): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/promotions/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete promotion');
}

// Payments API
export async function listPayments(dealId: number): Promise<Payment[]> {
  const res = await doFetch(`${getApiBaseUrl()}/api/payments?dealId=${dealId}`);
  if (!res.ok) throw new Error('Failed to fetch payments');
  return await res.json();
}

export async function createPayment(payment: Partial<Payment>): Promise<Payment> {
  const res = await doFetch(`${getApiBaseUrl()}/api/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payment),
  });
  if (!res.ok) throw new Error('Failed to create payment');
  return await res.json();
}

export async function updatePayment(paymentId: number, payment: Partial<Payment>): Promise<Payment> {
  const res = await doFetch(`${getApiBaseUrl()}/api/payments/${paymentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payment),
  });
  if (!res.ok) throw new Error('Failed to update payment');
  return await res.json();
}

export async function deletePayment(paymentId: number): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/payments/${paymentId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete payment');
}

// Documents API
export async function listDocuments(dealId: number): Promise<DealDocument[]> {
  const res = await doFetch(`${getApiBaseUrl()}/api/documents?dealId=${dealId}`);
  if (!res.ok) throw new Error('Failed to fetch documents');
  return await res.json();
}

export async function uploadDocument(dealId: number, file: File, name: string, documentType: DealDocument['documentType'], description?: string): Promise<DealDocument> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('dealId', String(dealId));
  formData.append('name', name);
  formData.append('documentType', documentType);
  if (description) formData.append('description', description);

  const res = await doFetch(`${getApiBaseUrl()}/api/documents`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload document');
  return await res.json();
}

export async function deleteDocument(documentId: number): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/documents/${documentId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete document');
}

// Commercial Proposals API
export async function listCommercialProposals(params?: { clientId?: number; dealId?: number; status?: string }): Promise<CommercialProposal[]> {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }
  const searchParams = new URLSearchParams();
  if (params?.clientId) searchParams.set('clientId', String(params.clientId));
  if (params?.dealId) searchParams.set('dealId', String(params.dealId));
  if (params?.status) searchParams.set('status', params.status);
  const url = `${getApiBaseUrl()}/api/commercial-proposals${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const res = await doFetch(url);
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error('Failed to fetch commercial proposals');
  }
  return await res.json();
}

export async function getCommercialProposal(id: number, shareToken?: string): Promise<CommercialProposal> {
  const url = shareToken 
    ? `${getApiBaseUrl()}/api/commercial-proposals/${id}?shareToken=${shareToken}`
    : `${getApiBaseUrl()}/api/commercial-proposals/${id}`;
  const res = await doFetch(url);
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error('Failed to fetch commercial proposal');
  }
  return await res.json();
}

export async function createCommercialProposal(proposal: Partial<CommercialProposal>): Promise<CommercialProposal> {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }
  const res = await doFetch(`${getApiBaseUrl()}/api/commercial-proposals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(proposal),
  });
  if (!res.ok) throw new Error('Failed to create commercial proposal');
  return await res.json();
}

export async function updateCommercialProposal(id: number, proposal: Partial<CommercialProposal>): Promise<CommercialProposal> {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }
  const res = await doFetch(`${getApiBaseUrl()}/api/commercial-proposals/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(proposal),
  });
  if (!res.ok) throw new Error('Failed to update commercial proposal');
  return await res.json();
}

export async function deleteCommercialProposal(id: number): Promise<void> {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }
  const res = await doFetch(`${getApiBaseUrl()}/api/commercial-proposals/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete commercial proposal');
}

export async function generateProposalShareLink(id: number): Promise<{ shareToken: string }> {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }
  const res = await doFetch(`${getApiBaseUrl()}/api/commercial-proposals/${id}/generate-share-link`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to generate share link');
  return await res.json();
}

// Notifications API
export async function listNotifications(unreadOnly?: boolean): Promise<Notification[]> {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }
  const params = unreadOnly ? '?unreadOnly=true' : '';
  const res = await doFetch(`${getApiBaseUrl()}/api/notifications${params}`);
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error('Failed to fetch notifications');
  }
  return await res.json();
}

export async function markNotificationRead(notificationId: number): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/notifications/${notificationId}/read`, { method: 'PUT' });
  if (!res.ok) throw new Error('Failed to mark notification as read');
}

export async function markAllNotificationsRead(): Promise<void> {
  const res = await doFetch(`${getApiBaseUrl()}/api/notifications/read-all`, { method: 'PUT' });
  if (!res.ok) throw new Error('Failed to mark all notifications as read');
}

export interface ProductAnalysis {
  matrix: Array<{
    name: string;
    price: number;
    demand: 'high' | 'medium' | 'low';
    competition: 'high' | 'medium' | 'low';
    recommendation: string;
  }>;
  insights: string[];
  suggestions: Array<{
    action: string;
    product: string;
    reason: string;
  }>;
  competitiveAnalysis: {
    strengths?: string[];
    weaknesses?: string[];
    opportunities?: string[];
    threats?: string[];
  };
  timestamp?: string;
}

export async function analyzeProducts(products: ProductItem[], promotions: PromotionItem[], competitorData?: any): Promise<ProductAnalysis> {
  const res = await doFetch(`${getApiBaseUrl()}/api/ai/analyze-products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ products, promotions, competitorData }),
  });
  if (!res.ok) throw new Error('Failed to analyze products');
  return await res.json();
}


