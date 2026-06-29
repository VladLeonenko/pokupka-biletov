/** Приоритетный hero на главной (маркетинг / прод). */
export const FEATURED_HERO_SLUG = 'olimpbet-superkubok-rossii';
export const FEATURED_HERO_REPERTOIRE_ID = 'olimpbet-superkubok-rossii';
export const FEATURED_HERO_HREF = `/ticket/${FEATURED_HERO_SLUG}`;

/** Снятый с витрины суперфинал (май 2026) — убираем из слайдера при дедупе. */
export const LEGACY_FEATURED_HERO_SLUG = 'superfinal-fonbet-kubka-rossii-spartak-krasnodar';
export const LEGACY_FEATURED_HERO_REPERTOIRE_ID = '6a05d17b46a4d000309ecf4e';

/** После этой даты (локально) — обычный слайдер без закрепа. */
const FEATURED_HERO_UNTIL_MS = new Date(2026, 6, 19, 0, 0, 0, 0).getTime();

export function isFeaturedHeroActive(): boolean {
  return Date.now() < FEATURED_HERO_UNTIL_MS;
}

export function isFeaturedHeroEventTitle(title: string | undefined): boolean {
  const t = String(title || '').trim();
  if (!t) return false;
  if (/olimpbet/i.test(t) && /суперкубок/i.test(t)) return true;
  if (/суперкубок\s+россии/i.test(t)) return true;
  return false;
}

function matchesSlugOrRep(id: string, slug: string, rep: string): boolean {
  const s = id.toLowerCase();
  if (rep && s === rep.toLowerCase()) return true;
  if (rep && s.includes(rep.toLowerCase())) return true;
  if (slug && s.includes(slug.toLowerCase())) return true;
  return false;
}

export function isLegacyFeaturedHeroSlideId(id: string | undefined): boolean {
  const s = String(id ?? '').trim().toLowerCase();
  if (!s) return false;
  return matchesSlugOrRep(s, LEGACY_FEATURED_HERO_SLUG, LEGACY_FEATURED_HERO_REPERTOIRE_ID);
}

export function isFeaturedHeroSlideId(id: string | undefined): boolean {
  const s = String(id ?? '').trim().toLowerCase();
  if (!s) return false;
  if (FEATURED_HERO_REPERTOIRE_ID && matchesSlugOrRep(s, FEATURED_HERO_SLUG, FEATURED_HERO_REPERTOIRE_ID)) {
    return true;
  }
  return s.includes(FEATURED_HERO_SLUG);
}

export function isFeaturedHeroHref(href: string | undefined): boolean {
  const h = String(href ?? '').toLowerCase();
  if (h.includes(FEATURED_HERO_SLUG)) return true;
  if (FEATURED_HERO_REPERTOIRE_ID && h.includes(FEATURED_HERO_REPERTOIRE_ID.toLowerCase())) return true;
  return false;
}

export function isLegacyFeaturedHeroHref(href: string | undefined): boolean {
  const h = String(href ?? '').toLowerCase();
  return h.includes(LEGACY_FEATURED_HERO_SLUG) || h.includes(LEGACY_FEATURED_HERO_REPERTOIRE_ID);
}
