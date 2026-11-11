/**
 * Пин HOT-постановок наверх афиши venue-хабов (ads 75k).
 * Матч по repertoireId / id / ЧПУ-slug / title.
 */

export const VENUE_AFISHA_PIN: Record<string, string[]> = {
  'mht-im-chehova': ['kabala-svyatosh', '686cd69c58f79d0030278b9d', 'gamlet', '6735c3a8569a15f2087ba5ee'],
  'bolshoy-teatr': [
    'novogodniy-balet-chaykovskogo-2026-12',
    'bayaderka-2026-11-13',
    'chaika-2026-11-18',
    'turandot-2026-11-20',
    'koppelia-2026-11-22',
    'petrushka-shekherazada-zhar-ptica-2026-11-24',
    'evgeniy-onegin-2026-11-26',
    'doch-faraona-2026-11-28',
  ],
};

const TITLE_PIN: Record<string, RegExp[]> = {
  'mht-im-chehova': [/кабала\s+святош/i, /гамлет/i],
  'bolshoy-teatr': [
    /новогодн\w*\s+балет\s+чайковского/i,
    /баядерка/i,
    /чайка/i,
    /турандот/i,
    /коппелия/i,
    /петрушка|шехеразада|жар-?птица/i,
    /евгений\s+онегин|онегин/i,
    /дочь\s+фараона/i,
  ],
};

function eventKeys(ev: { id?: string; repertoireId?: string; title?: string }): string[] {
  const out: string[] = [];
  for (const raw of [ev.repertoireId, ev.id]) {
    const s = String(raw || '')
      .trim()
      .toLowerCase();
    if (s) out.push(s);
  }
  return out;
}

function pinRank(
  venueCanon: string,
  ev: { id?: string; repertoireId?: string; title?: string },
): number {
  const pins = VENUE_AFISHA_PIN[venueCanon] || [];
  const keys = eventKeys(ev);
  for (let i = 0; i < pins.length; i += 1) {
    if (keys.includes(pins[i].toLowerCase())) return i;
  }
  const title = String(ev.title || '');
  const titlePins = TITLE_PIN[venueCanon] || [];
  for (let i = 0; i < titlePins.length; i += 1) {
    if (titlePins[i].test(title)) return i;
  }
  return Number.POSITIVE_INFINITY;
}

/** Стабильный pin: HOT сверху, остальное в исходном порядке. */
export function pinVenueAfishaEvents<T extends { id?: string; repertoireId?: string; title?: string }>(
  venueCanon: string,
  events: T[],
): T[] {
  if (!events.length || !VENUE_AFISHA_PIN[venueCanon]) return events;
  return events
    .map((ev, idx) => ({ ev, idx, rank: pinRank(venueCanon, ev) }))
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.idx - b.idx;
    })
    .map((x) => x.ev);
}
