import type { ImgHTMLAttributes } from 'react';
import { useState } from 'react';
import { toRoleWebpUrl, type ImageRole } from '@/utils/optimizedImage';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string;
  role?: ImageRole;
  fetchPriority?: 'high' | 'low' | 'auto';
};

/**
 * WebP via optimize + width by role. img.src never raw JPEG when optimize works.
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
  const wNum = typeof width === 'number' ? width : undefined;
  const webp = !useRaw ? toRoleWebpUrl(src, role, wNum) : null;
  const imgSrc = webp || src;

  return (
    <img
      src={imgSrc}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      sizes={sizes}
      className={className}
      style={style}
      onError={(e) => {
        if (webp && !useRaw) {
          setUseRaw(true);
          return;
        }
        onError?.(e);
      }}
      referrerPolicy={referrerPolicy}
      {...rest}
    />
  );
}
