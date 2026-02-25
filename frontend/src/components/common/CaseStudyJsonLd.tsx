import { useEffect } from 'react';

const SITE_URL = 'https://prime-coder.ru';

interface CaseStudyJsonLdProps {
  name: string;
  description: string;
  url: string;
  image?: string;
  datePublished?: string;
}

/**
 * CaseStudy structured data (Schema.org)
 * Rich snippet для страниц кейсов в поисковой выдаче
 */
export function CaseStudyJsonLd({ name, description, url, image, datePublished }: CaseStudyJsonLdProps) {
  useEffect(() => {
    const scriptId = 'casestudy-jsonld';
    const existing = document.getElementById(scriptId);
    if (existing) existing.remove();

    const imageUrl = image?.startsWith('http') ? image : image ? `${SITE_URL}${image}` : undefined;

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'CaseStudy',
      name,
      description,
      url,
      ...(imageUrl && { image: imageUrl }),
      author: {
        '@type': 'Organization',
        name: 'PrimeCoder',
        url: SITE_URL,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/legacy/img/logo.png` },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      ...(datePublished && { datePublished }),
    };

    const script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    script.text = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [name, description, url, image, datePublished]);

  return null;
}
