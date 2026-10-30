import type { ImgHTMLAttributes } from 'react';
import { toAvifUrl, toWebpUrl, type ImageRole } from '@/utils/optimizedImage';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string;
  role?: ImageRole;
  /** Cover = AVIF+WebP; card = WebP only */
  fetchPriority?: 'high' | 'low' | 'auto';
};

/**
 * <picture> wrapper: cover → avif+webp+orig; card → webp+orig.
 * Falls back to plain <img> when src is svg/data/already optimized.
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
  srcSet,
  onError,
  referrerPolicy,
  ...rest
}: Props) {
  const webp = toWebpUrl(src);
  const avif = role === 'cover' ? toAvifUrl(src) : null;

  if (!webp && !avif) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        style={style}
        width={width}
        height={height}
        loading={loading}
        decoding={decoding}
        fetchPriority={fetchPriority}
        sizes={sizes}
        srcSet={srcSet}
        onError={onError}
        referrerPolicy={referrerPolicy}
        {...rest}
      />
    );
  }

  return (
    <picture className={className} style={style}>
      {avif ? <source type="image/avif" srcSet={avif} sizes={sizes} /> : null}
      {webp ? <source type="image/webp" srcSet={webp} sizes={sizes} /> : null}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding={decoding}
        fetchPriority={fetchPriority}
        sizes={sizes}
        srcSet={srcSet}
        onError={onError}
        referrerPolicy={referrerPolicy}
        style={style ? undefined : { width: '100%', height: '100%', objectFit: 'cover' }}
        {...rest}
      />
    </picture>
  );
}
