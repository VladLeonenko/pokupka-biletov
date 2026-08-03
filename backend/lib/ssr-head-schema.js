/**
 * Global Organization + WebSite JSON-LD for seoRenderer head.
 */
import { siteBrand } from '../siteConfig.js';

function jsonLdScriptTag(schemas, id = 'bv-site-graph') {
  const list = (Array.isArray(schemas) ? schemas : [schemas]).filter(Boolean);
  if (!list.length) return '';
  const payload = list.length === 1 ? list[0] : { '@context': 'https://schema.org', '@graph': list };
  if (payload['@context'] == null && list.length === 1) {
    payload['@context'] = 'https://schema.org';
  }
  return `<script type="application/ld+json" id="${id}">${JSON.stringify(payload)}</script>`;
}

function organizationSchema(origin, brand) {
  return {
    '@type': 'Organization',
    '@id': `${origin}/#organization`,
    name: brand,
    url: `${origin}/`,
    logo: `${origin}/favicon.svg`,
  };
}

function websiteSchema(origin, brand) {
  return {
    '@type': 'WebSite',
    '@id': `${origin}/#website`,
    name: brand,
    url: `${origin}/`,
    inLanguage: 'ru-RU',
    publisher: { '@id': `${origin}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${origin}/events?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Org + WebSite всегда; на money URL (ticket) не дублируем WebPage.
 * @param {{ pathOnly: string; origin: string; metaTagsHtml?: string }} opts
 */
export function buildExtraHeadJsonLd({ pathOnly, origin, metaTagsHtml = '' }) {
  const path = String(pathOnly || '/').replace(/\/+$/, '') || '/';
  if (path.startsWith('/admin') || path.startsWith('/account') || path.startsWith('/cart')) {
    return '';
  }

  const brand = siteBrand();
  const base = origin.replace(/\/$/, '');
  const schemas = [organizationSchema(base, brand), websiteSchema(base, brand)];

  const alreadyRich = /application\/ld\+json/i.test(metaTagsHtml || '');
  const isMoney = path.startsWith('/ticket/');

  if (!alreadyRich && !isMoney) {
    const titleMatch = String(metaTagsHtml || '').match(/<title>([^<]*)<\/title>/i);
    const title = titleMatch?.[1]
      ? titleMatch[1]
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .trim()
      : brand;
    const descMatch = String(metaTagsHtml || '').match(
      /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i,
    );
    const description = descMatch?.[1]
      ? descMatch[1]
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .trim()
      : '';

    schemas.push({
      '@type': 'WebPage',
      '@id': `${base}${path === '/' ? '/' : path}#webpage`,
      name: title,
      description: description || undefined,
      url: `${base}${path === '/' ? '/' : path}`,
      inLanguage: 'ru-RU',
      isPartOf: { '@id': `${base}/#website` },
    });
  }

  return jsonLdScriptTag(schemas);
}
