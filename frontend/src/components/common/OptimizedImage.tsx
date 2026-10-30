import type { ImgHTMLAttributes } from 'react';
import { useState } from 'react';
import { toAvifUrl, toWebpUrl, type ImageRole } from '@/utils/optimizedImage';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string;
  role?: ImageRole;
  fetchPriority?: 'high' | 'low' | 'auto';
};

/**
 * cover → AVIF source + WebP img; card → WebP img.
 * img.src is never raw JPEG when optimize URL exists.
 */
export function OptimizedImage({
  src,
  role = 'card',
  alt = '',
  fetchPriority,
  loading,
  decoding = 'async',
  width,
  height,
  className,
  style,
  sizes,
  onError,
  referrerPolicy,
  ...rest
}: Props) {
  const [useRaw, setUseRaw] = useState(false);
  const webp = !useRaw ? toWebpUrl(src) : null;
  const avif = !useRaw && role === 'cover' ? toAvifUrl(src) : null;
  const imgSrc = webp || src;

  const img = (
    <img
      src={imgSrc}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      sizes={sizes}
      onError={(e) => {
        if (webp && !useRaw) {
          setUseRaw(true);
          return;
        }
        onError?.(e);
      }}
      referrerPolicy={referrerPolicy}
      style={avif || webp ? { width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...style } : style}
      className={avif || webp ? undefined : className}
      {...rest}
    />
  );

  if (!webp && !avif) return img;

  if (!avif) {
    return <picture className={className}>{img}</picture>;
  }

  return (
    <picture className={className}>
      <source type="image/avif" srcSet={avif} sizes={sizes} />
      {img}
    </picture>
  );
}
