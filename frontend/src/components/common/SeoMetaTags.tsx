import { useEffect } from 'react';

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

const SITE_NAME = 'PrimeCoder';
const DEFAULT_LOCALE = 'ru_RU';
const DEFAULT_IMAGE = 'https://prime-coder.ru/legacy/img/logo.png';

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

    // Open Graph
    setMetaTag('og:type', type, true);
    setMetaTag('og:site_name', SITE_NAME, true);
    setMetaTag('og:locale', DEFAULT_LOCALE, true);

    if (ogTitle || title) {
      setMetaTag('og:title', ogTitle || title || '', true);
    }
    if (ogDescription || description) {
      setMetaTag('og:description', ogDescription || description || '', true);
    }
    if (image) {
      setMetaTag('og:image', image, true);
    } else {
      setMetaTag('og:image', DEFAULT_IMAGE, true);
    }
    if (url) {
      setMetaTag('og:url', url, true);
    }

    // Twitter Card
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:site', '@primecoder');
    if (title) setMetaTag('twitter:title', title);
    if (description) setMetaTag('twitter:description', description);
    if (image) {
      setMetaTag('twitter:image', image);
    } else {
      setMetaTag('twitter:image', DEFAULT_IMAGE);
    }

    // Canonical URL
    if (url) {
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
      }
      canonical.setAttribute('href', url);
    }

    // JSON-LD: Article для блога или Organization по умолчанию
    if (title && description) {
      let script = document.querySelector('script[type="application/ld+json"][data-seo-schema]');
      if (!script) {
        script = document.createElement('script');
        script.setAttribute('type', 'application/ld+json');
        script.setAttribute('data-seo-schema', 'true');
        document.head.appendChild(script);
      }

      const structuredData = articleSchema
        ? {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: articleSchema.headline,
            datePublished: articleSchema.datePublished,
            dateModified: articleSchema.dateModified || articleSchema.datePublished,
            author: { '@type': 'Organization', name: 'PrimeCoder', url: 'https://prime-coder.ru' },
            publisher: { '@type': 'Organization', name: 'PrimeCoder', logo: { '@type': 'ImageObject', url: 'https://prime-coder.ru/legacy/img/logo.png' } },
            mainEntityOfPage: url ? { '@type': 'WebPage', '@id': url } : undefined,
          }
        : {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'PrimeCoder',
            description: description,
            url: 'https://prime-coder.ru',
            logo: 'https://prime-coder.ru/legacy/img/logo.png',
            contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', areaServed: 'RU', availableLanguage: 'Russian' },
            address: { '@type': 'PostalAddress', addressLocality: 'Москва', addressCountry: 'RU' },
          };

      script.textContent = JSON.stringify(structuredData);
    }
  }, [title, description, keywords, image, url, type, ogTitle, ogDescription, noindex, articleSchema]);

  return null;
}
