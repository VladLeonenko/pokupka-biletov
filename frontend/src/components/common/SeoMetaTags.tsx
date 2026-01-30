import { useEffect } from 'react';

interface SeoMetaTagsProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

export function SeoMetaTags({ 
  title, 
  description, 
  keywords, 
  image, 
  url, 
  type = 'website' 
}: SeoMetaTagsProps) {
  useEffect(() => {
    // Обновляем title
    if (title) {
      document.title = title;
    }

    // Функция для обновления/создания meta тега
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

    // Обновляем description
    if (description) {
      setMetaTag('description', description);
      setMetaTag('og:description', description, true);
    }

    // Обновляем keywords
    if (keywords) {
      setMetaTag('keywords', keywords);
    }

    // Open Graph теги
    if (title) {
      setMetaTag('og:title', title, true);
    }

    if (image) {
      setMetaTag('og:image', image, true);
    }

    if (url) {
      setMetaTag('og:url', url, true);
    }

    setMetaTag('og:type', type, true);

    // Twitter Card
    if (title) {
      setMetaTag('twitter:title', title);
    }

    if (description) {
      setMetaTag('twitter:description', description);
    }

    if (image) {
      setMetaTag('twitter:image', image);
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

    // Структурированные данные (JSON-LD) для SEO
    if (title && description) {
      let script = document.querySelector('script[type="application/ld+json"][data-seo-schema]');
      if (!script) {
        script = document.createElement('script');
        script.setAttribute('type', 'application/ld+json');
        script.setAttribute('data-seo-schema', 'true');
        document.head.appendChild(script);
      }
      
      const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: title.includes('PrimeCoder') ? 'PrimeCoder' : title,
        description: description,
        url: url || (typeof window !== 'undefined' ? window.location.origin : ''),
        logo: image || (typeof window !== 'undefined' ? `${window.location.origin}/legacy/img/logo.png` : ''),
        sameAs: [
          // Добавьте ссылки на соцсети если есть
        ],
      };
      
      script.textContent = JSON.stringify(structuredData);
    }
  }, [title, description, keywords, image, url, type]);

  return null;
}

