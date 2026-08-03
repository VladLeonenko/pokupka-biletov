import { useEffect } from 'react';
import { getSiteBaseUrl, SITE_BRAND } from '@/config/site';

type Props = {
  name: string;
  description?: string | null;
  url: string;
  image?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  venueName?: string | null;
  venueAddress?: string | null;
  minPriceRub?: number | null;
  currency?: string;
};

/** schema.org Event + AggregateOffer для /ticket/* */
export function EventJsonLd({
  name,
  description,
  url,
  image,
  startDate,
  endDate,
  venueName,
  venueAddress,
  minPriceRub,
  currency = 'RUB',
}: Props) {
  useEffect(() => {
    const scriptId = 'event-jsonld';
    document.getElementById(scriptId)?.remove();

    const siteUrl = getSiteBaseUrl();
    const imageUrl = image
      ? image.startsWith('http')
        ? image
        : `${siteUrl}${image.startsWith('/') ? '' : '/'}${image}`
      : undefined;

    const location =
      venueName || venueAddress
        ? {
            '@type': 'Place',
            name: venueName || undefined,
            address: venueAddress
              ? { '@type': 'PostalAddress', streetAddress: venueAddress, addressCountry: 'RU' }
              : undefined,
          }
        : undefined;

    const offers =
      minPriceRub != null && minPriceRub > 0
        ? {
            '@type': 'AggregateOffer',
            priceCurrency: currency,
            lowPrice: String(Math.round(minPriceRub)),
            availability: 'https://schema.org/InStock',
            url,
            seller: { '@type': 'Organization', name: SITE_BRAND, url: siteUrl },
          }
        : {
            '@type': 'Offer',
            availability: 'https://schema.org/InStock',
            url,
            seller: { '@type': 'Organization', name: SITE_BRAND, url: siteUrl },
          };

    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name,
      description: description?.trim() || name,
      url,
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      eventStatus: 'https://schema.org/EventScheduled',
      organizer: { '@type': 'Organization', name: SITE_BRAND, url: siteUrl },
      offers,
      ...(imageUrl ? { image: [imageUrl] } : {}),
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
      ...(location ? { location } : {}),
    };

    const script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    script.text = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [
    name,
    description,
    url,
    image,
    startDate,
    endDate,
    venueName,
    venueAddress,
    minPriceRub,
    currency,
  ]);

  return null;
}
