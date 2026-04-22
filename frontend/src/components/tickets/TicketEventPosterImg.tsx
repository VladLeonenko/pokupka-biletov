import { useState } from 'react';
import { posterGradientFromId } from '@/utils/ticketsPlaceholders';

type Props = {
  src: string;
  /** Для градиента при ошибке загрузки */
  gradientId: string;
  className: string;
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'auto' | 'sync';
};

/**
 * Постеры с внешних CDN (Яндекс и др.) часто отдают 403, если Referer — чужой сайт.
 * no-referrer снимает блок; при полном отказе — детерминированный градиент как в макете.
 */
export function TicketEventPosterImg({
  src,
  gradientId,
  className,
  loading = 'lazy',
  decoding = 'async',
}: Props) {
  const [broken, setBroken] = useState(false);
  const trimmed = src.trim();
  if (!trimmed || broken) {
    return (
      <div className={className} style={{ background: posterGradientFromId(gradientId) }} aria-hidden />
    );
  }
  return (
    <img
      src={trimmed}
      alt=""
      className={className}
      loading={loading}
      decoding={decoding}
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
    />
  );
}
