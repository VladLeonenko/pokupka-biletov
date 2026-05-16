/** Приоритетный hero на главной (маркетинг / прод). */
export const FEATURED_HERO_SLUG = 'superfinal-fonbet-kubka-rossii-spartak-krasnodar';
export const FEATURED_HERO_REPERTOIRE_ID = '6a05d17b46a4d000309ecf4e';
export const FEATURED_HERO_HREF = `/ticket/${FEATURED_HERO_SLUG}`;

export function isFeaturedHeroSlideId(id: string | undefined): boolean {
  const s = String(id ?? '').trim().toLowerCase();
  if (!s) return false;
  if (s === FEATURED_HERO_REPERTOIRE_ID) return true;
  if (s.includes(FEATURED_HERO_REPERTOIRE_ID)) return true;
  if (s.includes(FEATURED_HERO_SLUG)) return true;
  return false;
}

export function isFeaturedHeroHref(href: string | undefined): boolean {
  const h = String(href ?? '').toLowerCase();
  return h.includes(FEATURED_HERO_SLUG) || h.includes(FEATURED_HERO_REPERTOIRE_ID);
}
