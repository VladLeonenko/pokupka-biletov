import { useEffect, useState } from 'react';
import { posterGradientFromId } from '@/utils/ticketsPlaceholders';
import { toAvifUrl, toWebpUrl } from '@/utils/optimizedImage';

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
  /** cover = AVIF+WebP; card = WebP only */
  role?: 'cover' | 'card';
  width?: number;
  height?: number;
};

/**
 * Постеры: picture AVIF/WebP через /api/images/optimize + fallback.
 * no-referrer для внешних CDN; sizes снижает decode cost.
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

  useEffect(() => {
    const next = primary || fallback || '';
    setCurrent(next);
    setTriedFallback(!primary && Boolean(fallback));
  }, [primary, fallback]);

  if (!current) {
    return (
      <div className={className} style={{ background: posterGradientFromId(gradientId) }} aria-hidden />
    );
  }

  const useSrcSet = Boolean(srcSet && current === primary);
  const webp = toWebpUrl(current);
  const avif = role === 'cover' ? toAvifUrl(current) : null;

  const img = (
    <img
      src={current}
      srcSet={useSrcSet ? srcSet : undefined}
      sizes={sizes || undefined}
      alt={alt}
      className={avif || webp ? undefined : className}
      style={
        avif || webp
          ? { width: '100%', height: '100%', objectFit: 'cover', display: 'block' }
          : undefined
      }
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      width={width}
      height={height}
      referrerPolicy="no-referrer"
      onError={() => {
        if (!triedFallback && fallback && current !== fallback) {
          setTriedFallback(true);
          setCurrent(fallback);
          return;
        }
        setCurrent('');
      }}
    />
  );

  if (!webp && !avif) return img;

  return (
    <picture className={className}>
      {avif ? <source type="image/avif" srcSet={avif} sizes={sizes} /> : null}
      {webp ? <source type="image/webp" srcSet={webp} sizes={sizes} /> : null}
      {img}
    </picture>
  );
}
