import { useEffect, useState } from 'react';
import { posterGradientFromId } from '@/utils/ticketsPlaceholders';

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
};

/**
 * Постеры с внешних CDN (Яндекс и др.) часто отдают 403, если Referer — чужой сайт.
 * no-referrer снимает блок; дальше — category placeholder, затем градиент.
 * sizes/srcSet — когда CDN отдаёт несколько ширин; иначе sizes всё равно снижает decode cost.
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

  return (
    <img
      src={current}
      srcSet={useSrcSet ? srcSet : undefined}
      sizes={sizes || undefined}
      alt=""
      className={className}
      loading={loading}
      decoding={decoding}
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
}
