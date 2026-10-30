/**
 * CWV image helpers — route rasters through /api/images/optimize.
 * Covers + cards: WebP with explicit width (full-res encode was 200KB+ / slow).
 * AVIF skipped on LCP path — cold sharp AVIF encode ~1–2s stalls paint.
 */

export type ImageRole = 'cover' | 'card';

const OPTIMIZE_PATH = '/api/images/optimize';

/** Display-oriented defaults (2× retina-ish). */
export const IMAGE_OPT = {
  cover: { w: 960, q: 75 },
  heroBg: { w: 1280, q: 72 },
  card: { w: 480, q: 75 },
} as const;

function isRasterUrl(src: string): boolean {
  if (!src || src.startsWith('data:') || src.startsWith('blob:')) return false;
  if (/\.svg(\?|#|$)/i.test(src)) return false;
  if (/\.(avif|webp)(\?|#|$)/i.test(src)) return false;
  return true;
}

/** Absolute or site-relative URL safe for ?url= */
export function normalizeImageSrc(src: string): string {
  const s = (src || '').trim();
  if (!s) return '';
  if (s.startsWith('//')) return `https:${s}`;
  return s;
}

export function toOptimizedUrl(
  src: string,
  format: 'webp' | 'avif',
  opts?: { w?: number; h?: number; q?: number },
): string | null {
  const s = normalizeImageSrc(src);
  if (!s || !isRasterUrl(s)) return null;
  const params = new URLSearchParams();
  params.set('url', s);
  params.set('f', format);
  if (opts?.w) params.set('w', String(opts.w));
  if (opts?.h) params.set('h', String(opts.h));
  if (opts?.q) params.set('q', String(opts.q));
  else params.set('q', format === 'avif' ? 65 : 80);
  return `${OPTIMIZE_PATH}?${params.toString()}`;
}

export function toWebpUrl(src: string, opts?: { w?: number; h?: number; q?: number }): string | null {
  return toOptimizedUrl(src, 'webp', opts);
}

export function toAvifUrl(src: string, opts?: { w?: number; h?: number; q?: number }): string | null {
  return toOptimizedUrl(src, 'avif', opts);
}

/** WebP URL for role with default width/quality. */
export function toRoleWebpUrl(
  src: string,
  role: ImageRole,
  widthAttr?: number,
): string | null {
  // cover: always 960 — width={1200} attrs are layout hints, not pixel budget
  if (role === 'cover') {
    return toWebpUrl(src, { w: IMAGE_OPT.cover.w, q: IMAGE_OPT.cover.q });
  }
  const w =
    widthAttr && widthAttr > 0
      ? Math.min(640, Math.max(IMAGE_OPT.card.w, Math.round(widthAttr * 2)))
      : IMAGE_OPT.card.w;
  return toWebpUrl(src, { w, q: IMAGE_OPT.card.q });
}

export function isCoverImage(role: ImageRole): boolean {
  return role === 'cover';
}
