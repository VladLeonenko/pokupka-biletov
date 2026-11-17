/**
 * CWV image helpers — route rasters through /api/images/optimize.
 * Covers + cards: WebP with explicit width (full-res encode was 200KB+ / slow).
 * AVIF skipped on LCP path — cold sharp AVIF encode ~1–2s stalls paint.
 */

export type ImageRole = 'cover' | 'card';

const OPTIMIZE_PATH = '/api/images/optimize';

/**
 * Retina budgets. Hero на 100vw при 2× — до 1920, карточка до 1280.
 * Раньше 960/400: на десктопе и телефоне картинка растягивалась и пикселила.
 */
export const IMAGE_OPT = {
  cover: { w: 1920, q: 75 },
  heroBg: { w: 1920, q: 75 },
  card: { w: 1280, q: 74 },
} as const;

const ROLE_WIDTHS: Record<ImageRole, readonly number[]> = {
  cover: [1280, 1600, 1920],
  card: [640, 960, 1280],
};

function isRasterUrl(src: string): boolean {
  if (!src || src.startsWith('data:') || src.startsWith('blob:')) return false;
  if (/\.svg(\?|#|$)/i.test(src)) return false;
  // Уже WebP/AVIF без resize — не гоняем через optimize повторно
  if (/\.(avif|webp)(\?|#|$)/i.test(src) && !src.includes('/api/images/optimize')) return false;
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

/** Несколько ширин: браузер берёт файл под viewport × dpr, а не один зажатый кадр. */
export function toRoleWebpSrcSet(
  src: string,
  role: ImageRole,
): { src: string; srcSet: string } | null {
  const q = role === 'cover' ? IMAGE_OPT.cover.q : IMAGE_OPT.card.q;
  const parts: string[] = [];
  let fallback: string | null = null;
  for (const w of ROLE_WIDTHS[role]) {
    const url = toWebpUrl(src, { w, q });
    if (!url) return null;
    parts.push(`${url} ${w}w`);
    fallback = url;
  }
  if (!fallback) return null;
  return { src: fallback, srcSet: parts.join(', ') };
}

/** Самый широкий WebP роли. widthAttr — только вёрстка, не бюджет пикселей. */
export function toRoleWebpUrl(
  src: string,
  role: ImageRole,
  widthAttr?: number,
): string | null {
  void widthAttr;
  return toRoleWebpSrcSet(src, role)?.src ?? null;
}

export function isCoverImage(role: ImageRole): boolean {
  return role === 'cover';
}
