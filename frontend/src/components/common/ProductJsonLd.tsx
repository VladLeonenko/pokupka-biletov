import { useEffect } from 'react';

interface ProductJsonLdProps {
  product: {
    title: string;
    description?: string;
    imageUrl?: string;
    priceCents?: number;
    currency?: string;
    slug: string;
  };
  url: string;
}

const SITE_URL = 'https://prime-coder.ru';

export function ProductJsonLd({ product, url }: ProductJsonLdProps) {
  useEffect(() => {
    const scriptId = 'product-jsonld';
    const existingScript = document.getElementById(scriptId);
    if (existingScript) existingScript.remove();

    const priceRubles = product.priceCents ? Math.round(product.priceCents / 100) : 0;

    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: product.title,
      description: product.description || product.title,
      url: url,
      provider: {
        '@type': 'Organization',
        name: 'PrimeCoder',
        url: SITE_URL,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/legacy/img/logo.png` },
        address: { '@type': 'PostalAddress', addressLocality: 'Москва', addressCountry: 'RU' },
      },
      areaServed: { '@type': 'Country', name: 'Россия' },
      serviceType: 'Digital Services',
    };

    // Изображение — всегда URL
    if (product.imageUrl) {
      jsonLd.image = product.imageUrl.startsWith('http') ? product.imageUrl : `${SITE_URL}${product.imageUrl}`;
    }

    // Цена — Offer с корректными типами
    if (priceRubles > 0 && product.currency) {
      jsonLd.offers = {
        '@type': 'Offer',
        price: priceRubles.toString(),
        priceCurrency: product.currency,
        availability: 'https://schema.org/InStock',
        priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        seller: { '@type': 'Organization', name: 'PrimeCoder', url: SITE_URL },
      };
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    script.text = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [product, url]);

  return null;
}
