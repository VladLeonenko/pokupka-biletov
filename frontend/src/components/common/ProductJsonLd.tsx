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

    // Создаем JSON-LD разметку
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      description: product.description || product.title,
      image: product.imageUrl,
      url: url,
      ...(product.priceCents && product.currency && {
        offers: {
          '@type': 'Offer',
          price: (product.priceCents / 100).toFixed(2),
          priceCurrency: product.currency,
          availability: 'https://schema.org/InStock',
        },
      }),
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

