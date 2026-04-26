import { useEffect } from 'react';
import { getSiteBaseUrl } from '@/config/site';

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbJsonLdProps {
  items: BreadcrumbItem[];
}

/**
 * BreadcrumbList structured data (Schema.org)
 * Отображается как breadcrumb навигация в поисковой выдаче
 */
export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  useEffect(() => {
    if (!items || items.length === 0) return;

    const scriptId = 'breadcrumb-jsonld';
    const existing = document.getElementById(scriptId);
    if (existing) existing.remove();

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: {
          '@id': item.url.startsWith('http')
            ? item.url
            : `${getSiteBaseUrl()}${item.url.startsWith('/') ? item.url : '/' + item.url}`,
        },
      })),
    };

    const script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    script.text = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [items]);

  return null;
}
