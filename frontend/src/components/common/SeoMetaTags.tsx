import { useEffect } from 'react';
import { defaultOgImageUrl, getSiteBaseUrl, SITE_BRAND } from '@/config/site';

interface SeoMetaTagsProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  ogTitle?: string;
  ogDescription?: string;
  noindex?: boolean;
  /** Schema.org Article для статей блога (Perplexity, Google AI) */
  articleSchema?: { headline: string; datePublished?: string; dateModified?: string };
}

const DEFAULT_LOCALE = 'ru_RU';
const TWITTER_SITE = typeof import.meta.env.VITE_TWITTER_SITE === 'string' ? import.meta.env.VITE_TWITTER_SITE.trim() : '';

export function SeoMetaTags({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  ogTitle,
  ogDescription,
  noindex = false,
  articleSchema,
}: SeoMetaTagsProps) {
  useEffect(() => {
    const base = getSiteBaseUrl();
    const resolvedUrl = url || (typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : `${base}/`);

    if (title) {
      document.title = title;
    }

    const setMetaTag = (name: string, content: string, property?: boolean) => {
      const attribute = property ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    const removeMeta = (name: string, property?: boolean) => {
      const attribute = property ? 'property' : 'name';
      document.querySelector(`meta[${attribute}="${name}"]`)?.remove();
    };

    // robots
    setMetaTag('robots', noindex ? 'noindex, nofollow' : 'index, follow');

    // Description
    if (description) {
      setMetaTag('description', description);
    }

    // Keywords
    if (keywords) {
      setMetaTag('keywords', keywords);
    }

    const defaultImg = defaultOgImageUrl();

    // Open Graph
    setMetaTag('og:type', type, true);
    setMetaTag('og:site_name', SITE_BRAND, true);
    setMetaTag('og:locale', DEFAULT_LOCALE, true);

    if (ogTitle || title) {
      setMetaTag('og:title', ogTitle || title || '', true);
    }
    if (ogDescription || description) {
      setMetaTag('og:description', ogDescription || description || '', true);
    }
    if (image) {
      setMetaTag('og:image', image.startsWith('http') ? image : `${base}${image.startsWith('/') ? '' : '/'}${image}`, true);
    } else {
      setMetaTag('og:image', defaultImg, true);
    }
    setMetaTag('og:url', resolvedUrl, true);

    // Twitter Card
    setMetaTag('twitter:card', 'summary_large_image');
    if (TWITTER_SITE) {
      setMetaTag('twitter:site', TWITTER_SITE);
    } else {
      removeMeta('twitter:site');
    }
    if (title) setMetaTag('twitter:title', title);
    if (description) setMetaTag('twitter:description', description);
    setMetaTag('twitter:url', resolvedUrl);
    if (image) {
      setMetaTag('twitter:image', image.startsWith('http') ? image : `${base}${image.startsWith('/') ? '' : '/'}${image}`);
    } else {
      setMetaTag('twitter:image', defaultImg);
    }

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', resolvedUrl);

    const logoUrl = defaultImg;
    let script = document.querySelector('script[type="application/ld+json"][data-seo-schema]') as HTMLScriptElement | null;
    if (articleSchema && title && description) {
      if (!script) {
        script = document.createElement('script');
        script.setAttribute('type', 'application/ld+json');
        script.setAttribute('data-seo-schema', 'true');
        document.head.appendChild(script);
      }
      const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: articleSchema.headline,
        datePublished: articleSchema.datePublished,
        dateModified: articleSchema.dateModified || articleSchema.datePublished,
        author: { '@type': 'Organization', name: SITE_BRAND, url: base },
        publisher: {
          '@type': 'Organization',
          name: SITE_BRAND,
          logo: { '@type': 'ImageObject', url: logoUrl },
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': resolvedUrl },
      };
      script.textContent = JSON.stringify(structuredData);
    } else if (title && description) {
      if (!script) {
        script = document.createElement('script');
        script.setAttribute('type', 'application/ld+json');
        script.setAttribute('data-seo-schema', 'true');
        document.head.appendChild(script);
      }
      const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: title,
        description,
        url: resolvedUrl,
        inLanguage: 'ru-RU',
        isPartOf: {
          '@type': 'WebSite',
          name: SITE_BRAND,
          url: `${base}/`,
        },
      };
      script.textContent = JSON.stringify(structuredData);
    } else if (script && !articleSchema) {
      script.remove();
    }
  }, [title, description, keywords, image, url, type, ogTitle, ogDescription, noindex, articleSchema]);

  return null;
}
