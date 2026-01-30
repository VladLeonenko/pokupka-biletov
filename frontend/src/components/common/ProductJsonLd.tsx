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

export function ProductJsonLd({ product, url }: ProductJsonLdProps) {
  useEffect(() => {
    const scriptId = 'product-jsonld';
    
    // Удаляем старый скрипт если есть
    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      existingScript.remove();
    }

    // Создаем расширенную JSON-LD разметку
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: product.title,
      description: product.description || product.title,
      image: product.imageUrl,
      url: url,
      provider: {
        '@type': 'Organization',
        name: 'PrimeCoder',
        url: typeof window !== 'undefined' ? window.location.origin : '',
      },
      areaServed: {
        '@type': 'Country',
        name: 'Russia',
      },
      serviceType: 'Web Development',
      ...(product.priceCents && product.currency && {
        offers: {
          '@type': 'Offer',
          price: (product.priceCents / 100).toFixed(2),
          priceCurrency: product.currency,
          availability: 'https://schema.org/InStock',
          priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
      }),
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        reviewCount: '150',
      },
    };

    const script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    script.text = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    return () => {
      const scriptToRemove = document.getElementById(scriptId);
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [product, url]);

  return null;
}

