import { slugify } from './eventSlug.js';

/** Legacy SEO-slug → канонический slug (после slugify PlaceName). */
export const VENUE_SLUG_ALIASES = {
  'mht-chehova': 'mht-im-chehova',
  luzhniki: 'bsa-luzhniki',
  'bolshoi-theatre': 'bolshoy-teatr',
  bolshoi: 'bolshoy-teatr',
  'bolshoi-teatr': 'bolshoy-teatr',
};

export const VENUE_SLUG_LABELS = {
  'mht-chehova': 'МХТ им. Чехова',
  'mht-im-chehova': 'МХТ им. Чехова',
  'bolshoy-teatr': 'Большой театр',
  'bolshoi-theatre': 'Большой театр',
  'teatr-na-taganke': 'Театр на Таганке',
  'krokus-siti-holl': 'Крокус Сити Холл',
  'vtb-arena': 'ВТБ Арена',
  luzhniki: 'БСА «Лужники»',
  'bsa-luzhniki': 'БСА «Лужники»',
};

/** @param {string} name */
export function venueSlugFromName(name) {
  return slugify(String(name || '').trim());
}

/** @param {string | undefined | null} rawSlug */
export function canonicalizeVenueSlug(rawSlug) {
  const key = String(rawSlug || '')
    .trim()
    .toLowerCase();
  if (!key) return '';
  return VENUE_SLUG_ALIASES[key] || key;
}

/**
 * @param {Iterable<string>} venueNames
 * @returns {{ slug: string, label: string }[]}
 */
export function buildVenueLandingList(venueNames) {
  const bySlug = new Map();
  for (const raw of venueNames) {
    const name = String(raw || '').trim();
    if (!name) continue;
    const s = venueSlugFromName(name);
    if (!s) continue;
    const prev = bySlug.get(s);
    if (!prev || name.length > prev.length) bySlug.set(s, name);
  }
  return [...bySlug.entries()]
    .map(([slug, label]) => ({ slug, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ru'));
}
