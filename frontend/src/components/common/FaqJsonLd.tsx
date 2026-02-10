import { useEffect } from 'react';

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqJsonLdProps {
  items: FaqItem[];
}

/**
 * FAQPage structured data (Schema.org)
 * Отображается как FAQ rich snippet в Google
 */
export function FaqJsonLd({ items }: FaqJsonLdProps) {
  useEffect(() => {
    if (!items || items.length === 0) return;

    const scriptId = 'faq-jsonld';
    const existing = document.getElementById(scriptId);
    if (existing) existing.remove();

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
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
