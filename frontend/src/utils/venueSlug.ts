import { slugify } from '@/utils/slugify';

/**
 * Legacy SEO-slug → канонический slug (после slugify реального PlaceName).
 * Старые URL из sitemap/рекламы не ломаем.
 */
export const VENUE_SLUG_ALIASES: Record<string, string> = {
  'mht-chehova': 'mht-im-chehova',
  luzhniki: 'bsa-luzhniki',
  'bsa-luzhniki': 'bsa-luzhniki',
  'bolshoi-theatre': 'bolshoy-teatr',
  bolshoi: 'bolshoy-teatr',
  'bolshoi-teatr': 'bolshoy-teatr',
};

/** Ручные подписи для SEO, если slug не резолвится из API. */
export const VENUE_SLUG_LABELS: Record<string, string> = {
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

export function venueSlugFromName(name: string): string {
  return slugify(String(name || '').trim());
}

export function canonicalizeVenueSlug(rawSlug: string | undefined | null): string {
  const key = String(rawSlug || '')
    .trim()
    .toLowerCase();
  if (!key) return '';
  return VENUE_SLUG_ALIASES[key] || key;
}

/**
 * Найти имя площадки по slug среди известных названий (GetPlaceList + афиша).
 */
export function resolveVenueNameFromSlug(
  slug: string | undefined | null,
  venueNames: Iterable<string>,
): string | null {
  const canon = canonicalizeVenueSlug(slug);
  if (!canon) return null;

  const bySlug = new Map<string, string>();
  for (const raw of venueNames) {
    const name = String(raw || '').trim();
    if (!name) continue;
    const s = venueSlugFromName(name);
    if (!s) continue;
    // Предпочитаем более длинное/полное имя при коллизии slug
    const prev = bySlug.get(s);
    if (!prev || name.length > prev.length) bySlug.set(s, name);
  }

  if (bySlug.has(canon)) return bySlug.get(canon)!;

  const labeled = VENUE_SLUG_LABELS[canon] || VENUE_SLUG_LABELS[String(slug || '').trim().toLowerCase()];
  if (labeled) {
    const labeledSlug = venueSlugFromName(labeled);
    if (bySlug.has(labeledSlug)) return bySlug.get(labeledSlug)!;
    return labeled;
  }

  return null;
}

export function buildVenueLandingList(
  venueNames: Iterable<string>,
): { slug: string; label: string }[] {
  const bySlug = new Map<string, string>();
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
