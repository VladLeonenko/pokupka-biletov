/**
 * CWV image helpers — route rasters through /api/images/optimize.
 * Covers (hero/poster/banner/LCP): AVIF + WebP; cards: WebP.
 * SVG / data: / already-optimized left alone.
 */

export type ImageRole = 'cover' | 'card';

const OPTIMIZE_PATH = '/api/images/optimize';

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
  else params.set('q', format === 'avif' ? '65' : '80');
  return `${OPTIMIZE_PATH}?${params.toString()}`;
}

export function toWebpUrl(src: string, opts?: { w?: number; h?: number; q?: number }): string | null {
  return toOptimizedUrl(src, 'webp', opts);
}

export function toAvifUrl(src: string, opts?: { w?: number; h?: number; q?: number }): string | null {
  return toOptimizedUrl(src, 'avif', opts);
}

export function isCoverImage(role: ImageRole): boolean {
  return role === 'cover';
}
