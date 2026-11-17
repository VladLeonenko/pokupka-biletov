import { useEffect, useState } from 'react';
import { posterGradientFromId } from '@/utils/ticketsPlaceholders';
import { toRoleWebpSrcSet } from '@/utils/optimizedImage';

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
  const generated = !useRaw ? toRoleWebpSrcSet(current, role) : null;
  const imgSrc = generated?.src || current;
  const srcSetOut = generated?.srcSet || (useSrcSet ? srcSet : undefined);
  const sizesAttr =
    sizes ||
    (generated ? (role === 'cover' ? '100vw' : '(min-width: 1024px) 24vw, (min-width: 640px) 46vw, 92vw') : undefined);

  const onImgError = () => {
    if (generated && !useRaw) {
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
  };

  // <picture> + type=image/webp — браузер сразу берёт WebP-ветку, без sniff JPEG
  if (generated) {
    return (
      <picture>
        <source srcSet={generated.srcSet} type="image/webp" sizes={sizesAttr} />
        <img
          src={imgSrc}
          srcSet={srcSetOut}
          sizes={sizesAttr}
          alt={alt}
          className={className}
          loading={loading}
          decoding={decoding}
          fetchPriority={fetchPriority}
          width={width}
          height={height}
          referrerPolicy="no-referrer"
          onError={onImgError}
        />
      </picture>
    );
  }

  return (
    <img
      src={imgSrc}
      srcSet={srcSetOut}
      sizes={sizesAttr}
      alt={alt}
      className={className}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      width={width}
      height={height}
      referrerPolicy="no-referrer"
      onError={onImgError}
    />
  );
}
