import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { defaultOgImageUrl, getSiteBaseUrl, SITE_BRAND } from '@/config/site';
import {
  resolveSitePageSeo,
  resolveEventsFilterSeo,
} from '@/seo/siteSeoCatalog';

const NOINDEX_PATHS = [
  '/admin',
  '/account',
  '/cart',
  '/wishlist',
  '/register',
  '/auth',
  '/orders',
  '/commercial-proposals',
  '/tools',
  '/ai-chat',
  '/404',
];

function normalizePath(pathname: string): string {
  if (!pathname) return '/';
  const normalized = pathname.replace(/\/+$/, '');
  return normalized || '/';
}

function escapeJson(value: string): string {
  return value.replace(/</g, '\\u003c');
}

function resolveRouteMeta(path: string): { title: string; description: string } {
  const staticHit = resolveSitePageSeo(path);
  if (staticHit) {
    return { title: staticHit.title, description: staticHit.description };
  }

  const filterMatch = path.match(/^\/events\/(city|genre|venue)\/([^/]+)$/);
  if (filterMatch) {
    const kind = filterMatch[1] as 'city' | 'genre' | 'venue';
    const filterSeo = resolveEventsFilterSeo(kind, decodeURIComponent(filterMatch[2]));
    if (filterSeo) {
      return { title: filterSeo.title, description: filterSeo.description };
    }
  }

  if (path.startsWith('/ticket/')) {
    return {
      title: 'Купить билет онлайн — схема зала и оплата',
      description:
        'Оформите билет онлайн: выберите места на схеме зала, оплатите и получите электронный билет.',
    };
  }

  return {
    title: `${SITE_BRAND} — билеты на мероприятия онлайн`,
    description:
      'Покупка билетов на концерты, театр и спорт онлайн: схема зала, выбор мест и электронный билет.',
  };
}

export function RouteSeoDefaults() {
  const location = useLocation();

  const meta = useMemo(() => {
    const path = normalizePath(location.pathname);
    const { title, description } = resolveRouteMeta(path);
    const noindex = NOINDEX_PATHS.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    );
    return { path, title, description, noindex };
  }, [location.pathname]);

  useEffect(() => {
    const baseUrl = getSiteBaseUrl();
    const canonicalUrl = `${baseUrl}${meta.path === '/' ? '/' : meta.path}`;
    const defaultImage = defaultOgImageUrl();

    const setMetaTag = (name: string, content: string, property = false) => {
      const attribute = property ? 'property' : 'name';
      let tag = document.querySelector(`meta[${attribute}="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attribute, name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    const setLinkTag = (rel: string, href: string, hreflang?: string) => {
      const selector = hreflang
        ? `link[rel="${rel}"][hreflang="${hreflang}"]`
        : `link[rel="${rel}"]:not([hreflang])`;
      let link = document.querySelector(selector);
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', rel);
        if (hreflang) link.setAttribute('hreflang', hreflang);
        document.head.appendChild(link);
      }
      link.setAttribute('href', href);
    };

    document.title = meta.title;
    setMetaTag('description', meta.description);
    setMetaTag('robots', meta.noindex ? 'noindex, nofollow' : 'index, follow');
    setMetaTag('og:type', 'website', true);
    setMetaTag('og:site_name', SITE_BRAND, true);
    setMetaTag('og:locale', 'ru_RU', true);
    setMetaTag('og:title', meta.title, true);
    setMetaTag('og:description', meta.description, true);
    setMetaTag('og:url', canonicalUrl, true);
    setMetaTag('og:image', defaultImage, true);
    setMetaTag('og:image:alt', `${meta.title} - ${SITE_BRAND}`, true);
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', meta.title);
    setMetaTag('twitter:description', meta.description);
    setMetaTag('twitter:image', defaultImage);
    setMetaTag('twitter:url', canonicalUrl);
    setLinkTag('canonical', canonicalUrl);
    setLinkTag('alternate', canonicalUrl, 'ru-RU');
    setLinkTag('alternate', canonicalUrl, 'x-default');

    const schemaData = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: meta.title,
      description: meta.description,
      url: canonicalUrl,
      inLanguage: 'ru-RU',
      isPartOf: {
        '@type': 'WebSite',
        name: SITE_BRAND,
        url: `${baseUrl}/`,
      },
    };

    let schema = document.querySelector(
      'script[type="application/ld+json"][data-route-seo-schema]',
    ) as HTMLScriptElement | null;
    if (!schema) {
      schema = document.createElement('script');
      schema.type = 'application/ld+json';
      schema.setAttribute('data-route-seo-schema', 'true');
      document.head.appendChild(schema);
    }
    schema.textContent = escapeJson(JSON.stringify(schemaData));
  }, [meta]);

  return null;
}
