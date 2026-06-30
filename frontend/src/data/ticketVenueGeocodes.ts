export type VenueGeocode = {
  lat: number;
  lng: number;
  label: string;
  city?: string;
  aliases: string[];
};

/** Ручной справочник топ-площадок (расширяется по мере появления в каталоге). */
export const TICKET_VENUE_GEOCODES: VenueGeocode[] = [
  { label: 'Лужники', lat: 55.7158, lng: 37.5536, city: 'Москва', aliases: ['лужники', 'стадион лужники', 'luzhniki'] },
  { label: 'ВТБ Арена', lat: 55.8177, lng: 37.4403, city: 'Москва', aliases: ['vtb арена', 'втб арена', 'динамо'] },
  { label: 'Крокус Сити Холл', lat: 55.818, lng: 37.388, city: 'Москва', aliases: ['крокус', 'crocus city hall', 'крокус сити'] },
  { label: 'Театр на Таганке', lat: 55.7395, lng: 37.6539, city: 'Москва', aliases: ['таганке', 'taganka'] },
  { label: 'МХТ им. Чехова', lat: 55.7603, lng: 37.6036, city: 'Москва', aliases: ['мхт', 'chekhov', 'чехова'] },
  { label: 'Театр Вахтангова', lat: 55.7609, lng: 37.6011, city: 'Москва', aliases: ['вахтангов', 'vakhtangov'] },
  { label: 'РАМТ', lat: 55.7586, lng: 37.6017, city: 'Москва', aliases: ['рамт', 'музыкальный театр', 'ramt'] },
  { label: 'Большой театр', lat: 55.7602, lng: 37.6186, city: 'Москва', aliases: ['большой театр', 'bolshoi'] },
  { label: 'МДМ', lat: 55.7312, lng: 37.601, city: 'Москва', aliases: ['mdm', 'московский дворец молодежи'] },
  { label: 'Государственный Кремлёвский дворец', lat: 55.751, lng: 37.615, city: 'Москва', aliases: ['кремлевский', 'кремлёвский дворец'] },
  { label: 'СК «Олимпийский»', lat: 55.7812, lng: 37.6278, city: 'Москва', aliases: ['олимпийский', 'olympic'] },
  { label: 'Мариинский театр', lat: 59.9255, lng: 30.2945, city: 'Санкт-Петербург', aliases: ['мариинский', 'mariinsky'] },
  { label: 'БДТ', lat: 59.927, lng: 30.347, city: 'Санкт-Петербург', aliases: ['бдт', 'большой драматический'] },
  { label: 'Ледовый Дворец', lat: 59.972, lng: 30.221, city: 'Санкт-Петербург', aliases: ['ледовый дворец', 'ice palace'] },
  { label: 'Казань Арена', lat: 55.8208, lng: 49.1614, city: 'Казань', aliases: ['казань арена', 'kazan arena'] },
  { label: 'Екатеринбург Арена', lat: 56.8328, lng: 60.5736, city: 'Екатеринбург', aliases: ['екатеринбург арена'] },
];

export const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  москва: { lat: 55.7558, lng: 37.6173 },
  'санкт-петербург': { lat: 59.9343, lng: 30.3351 },
  'спб': { lat: 59.9343, lng: 30.3351 },
  казань: { lat: 55.7963, lng: 49.1088 },
  екатеринбург: { lat: 56.8389, lng: 60.6057 },
  новосибирск: { lat: 55.0084, lng: 82.9357 },
};

function normKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\d\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolveVenueGeocode(
  venue?: string | null,
  venueAddress?: string | null,
): VenueGeocode | null {
  const blob = normKey([venue, venueAddress].filter(Boolean).join(' '));
  if (!blob) return null;

  for (const entry of TICKET_VENUE_GEOCODES) {
    const keys = [entry.label, ...entry.aliases].map(normKey);
    if (keys.some((k) => k && (blob.includes(k) || k.includes(blob)))) {
      return entry;
    }
  }

  for (const [city, center] of Object.entries(CITY_CENTERS)) {
    if (blob.includes(city)) {
      return { ...center, label: venue?.trim() || city, city, aliases: [] };
    }
  }

  return null;
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
