import React, { useState, SyntheticEvent } from 'react';
import { Box, BoxProps } from '@mui/material';
import { resolveImageUrl, fallbackImageUrl } from '@/utils/resolveImageUrl';

interface OptimizedImageProps extends Omit<BoxProps, 'component'> {
  src?: string | null;
  alt: string;
  loading?: 'lazy' | 'eager';
  width?: number | string;
  height?: number | string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  onError?: (e: SyntheticEvent<HTMLImageElement, Event>) => void;
}

/**
 * Оптимизированный компонент изображения с lazy loading и WebP поддержкой
 */
export function OptimizedImage({
  src,
  alt,
  loading = 'lazy',
  width,
  height,
  objectFit = 'cover',
  onError,
  sx,
  ...boxProps
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(src || null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const imageUrl = imageSrc ? resolveImageUrl(imageSrc) : fallbackImageUrl();
  const fallback = fallbackImageUrl();

  // Конвертируем URL в WebP если возможно
  const getWebPUrl = (url: string): string => {
    // Если уже WebP или data URL, возвращаем как есть
    if (url.includes('.webp') || url.startsWith('data:')) {
      return url;
    }
    // Для других форматов можно добавить конвертацию через API
    // Пока возвращаем оригинальный URL
    return url;
  };

  const handleError = (e: SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    
    // Если это была попытка загрузить WebP, пробуем оригинал
    if (target.src !== imageUrl && !hasError) {
      setHasError(true);
      target.src = imageUrl;
      return;
    }
    
    // Если и оригинал не загрузился, используем fallback
    if (target.src !== fallback) {
      target.onerror = null;
      target.src = fallback;
      setIsLoading(false);
    }
    
    if (onError) {
      onError(e);
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  return (
    <Box
      component="img"
      src={loading === 'eager' ? getWebPUrl(imageUrl) : imageUrl}
      alt={alt}
      loading={loading}
      width={width}
      height={height}
      onError={handleError}
      onLoad={handleLoad}
      sx={{
        objectFit,
        transition: 'opacity 0.3s ease',
        opacity: isLoading ? 0.5 : 1,
        ...sx,
      }}
      {...boxProps}
    />
  );
}






