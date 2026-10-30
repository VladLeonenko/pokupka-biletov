import { useEffect, useState } from 'react';
import { posterGradientFromId } from '@/utils/ticketsPlaceholders';
import { toRoleWebpUrl } from '@/utils/optimizedImage';

type Props = {
  src?: string | null;
  /** Заглушка по типу события, если src пустой или CDN отдал 403 */
  fallbackSrc?: string | null;
  /** Для градиента при полном отказе */
  gradientId: string;
  className: string;
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'auto' | 'sync';
  /** Подсказка браузеру для выбора размера (srcset/CDN) */
  sizes?: string;
  srcSet?: string;
  /** Alt для SEO/доступности (по умолчанию пустой). */
  alt?: string;
  /** LCP / hero covers — high; cards default auto */
  fetchPriority?: 'high' | 'low' | 'auto';
  /** cover = LCP/hero WebP; card = list WebP (smaller w) */
  role?: 'cover' | 'card';
  width?: number;
  height?: number;
};

/**
 * Постеры через /api/images/optimize WebP + width.
 * Без AVIF на LCP (холодный encode тормозит paint).
 */
export function TicketEventPosterImg({
  src,
  fallbackSrc,
  gradientId,
  className,
  loading = 'lazy',
  decoding = 'async',
  sizes,
  srcSet,
  alt = '',
  fetchPriority,
  role = 'card',
  width,
  height,
}: Props) {
  const primary = (src || '').trim();
  const fallback = (fallbackSrc || '').trim();
  const initial = primary || fallback || '';
  const [current, setCurrent] = useState(initial);
  const [triedFallback, setTriedFallback] = useState(!primary && Boolean(fallback));
  const [useRaw, setUseRaw] = useState(false);

  useEffect(() => {
    const next = primary || fallback || '';
    setCurrent(next);
    setTriedFallback(!primary && Boolean(fallback));
    setUseRaw(false);
  }, [primary, fallback]);

  if (!current) {
    return (
      <div className={className} style={{ background: posterGradientFromId(gradientId) }} aria-hidden />
    );
  }

  const useSrcSet = Boolean(srcSet && current === primary && useRaw);
  const webp = !useRaw ? toRoleWebpUrl(current, role, width) : null;
  const imgSrc = webp || current;

  return (
    <img
      src={imgSrc}
      srcSet={useSrcSet ? srcSet : undefined}
      sizes={sizes || undefined}
      alt={alt}
      className={className}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      width={width}
      height={height}
      referrerPolicy="no-referrer"
      onError={() => {
        if (webp && !useRaw) {
          setUseRaw(true);
          return;
        }
        if (!triedFallback && fallback && current !== fallback) {
          setTriedFallback(true);
          setUseRaw(false);
          setCurrent(fallback);
          return;
        }
        setCurrent('');
      }}
    />
  );
}
