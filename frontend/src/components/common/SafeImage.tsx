import { useState, SyntheticEvent, useMemo, useEffect, useRef } from 'react';
import { Box, BoxProps } from '@mui/material';
import { resolveImageUrl, fallbackImageUrl } from '@/utils/resolveImageUrl';

interface SafeImageProps extends Omit<BoxProps, 'component'> {
  src?: string | null;
  image?: string | null; // Для совместимости с CardMedia
  alt?: string;
  fallback?: string;
  /** Если true, изображение будет скрыто при ошибке загрузки, иначе будет использован fallback */
  hideOnError?: boolean;
  /** Использовать lazy loading (по умолчанию true) */
  lazy?: boolean;
}

/**
 * Безопасный компонент для загрузки изображений
 * Автоматически обрабатывает ошибки загрузки и скрывает изображение или использует fallback
 */
export function SafeImage({ 
  src, 
  image, // Для совместимости с CardMedia
  alt = '', 
  fallback, 
  hideOnError = true,
  lazy = true,
  sx,
  ...boxProps 
}: SafeImageProps) {
  // Используем image если передан (для CardMedia), иначе src
  const actualSrc = image || src;
  
  // Проверяем валидность src - если пустой или невалидный, сразу используем fallback
  const isValidSrc = useMemo(() => {
    if (!actualSrc || typeof actualSrc !== 'string') return false;
    const trimmed = actualSrc.trim();
    if (trimmed.length === 0) return false;
    // Проверяем, что это не просто пробелы или служебные символы
    if (/^[\s\-_]+$/.test(trimmed)) return false;
    return true;
  }, [actualSrc]);

  const initialImageSrc = useMemo(() => {
    if (!isValidSrc) {
      const fallbackUrl = fallback || fallbackImageUrl();
      // Если hideOnError и нет валидного src, возвращаем пустую строку (изображение будет скрыто)
      if (hideOnError) {
        return '';
      }
      // Убеждаемся, что fallback не пустой
      return fallbackUrl && fallbackUrl.trim().length > 0 ? fallbackUrl : fallbackImageUrl();
    }
    
    // Для статических файлов (/legacy/, /uploads/) не используем fallback в resolveImageUrl
    // чтобы SafeImage мог сам обработать ошибку загрузки
    const trimmedSrc = actualSrc!.trim();
    if (trimmedSrc.startsWith('/legacy/') || trimmedSrc.startsWith('/uploads/')) {
      // Для статических файлов просто возвращаем путь, без fallback
      return trimmedSrc;
    }
    
    // Для остальных путей используем resolveImageUrl с fallback
    const resolved = resolveImageUrl(actualSrc!, fallback || fallbackImageUrl());
    // Убеждаемся, что resolved не пустой
    return resolved && resolved.trim().length > 0 ? resolved : (fallback || fallbackImageUrl());
  }, [actualSrc, isValidSrc, fallback, hideOnError]);

  const [imageSrc, setImageSrc] = useState<string>(initialImageSrc);
  const [isVisible, setIsVisible] = useState(() => {
    // Если нет валидного src и hideOnError, сразу скрываем
    if (!isValidSrc && hideOnError) return false;
    return initialImageSrc.length > 0;
  });
  const errorHandledRef = useRef(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const attemptCountRef = useRef(0); // Счетчик попыток загрузки

  // Отслеживаем, используется ли fallback
  const isFallbackActiveRef = useRef(false);
  const lastInitialSrcRef = useRef(initialImageSrc);
  
  // Обновляем imageSrc только когда меняется исходный src (не fallback)
  useEffect(() => {
    // Если initialImageSrc действительно изменился (новый src, не fallback)
    if (lastInitialSrcRef.current !== initialImageSrc && !isFallbackActiveRef.current) {
      lastInitialSrcRef.current = initialImageSrc;
      setImageSrc(initialImageSrc);
      setIsVisible(initialImageSrc.length > 0 && (!hideOnError || isValidSrc));
      errorHandledRef.current = false;
      attemptCountRef.current = 0;
      isFallbackActiveRef.current = false;
    }
  }, [initialImageSrc, hideOnError, isValidSrc]);

  // Обнуляем onerror при размонтировании
  useEffect(() => {
    return () => {
      const img = imgRef.current;
      if (img) {
        img.onerror = null;
      }
    };
  }, []);

  const handleError = (e: SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    
    // КРИТИЧНО: Обнуляем onerror СРАЗУ, чтобы предотвратить повторные попытки загрузки
    target.onerror = null;
    
    // Останавливаем дальнейшее распространение события
    e.stopPropagation();
    e.preventDefault();
    
    // Подавляем ошибку в консоли (не можем полностью, но пытаемся)
    try {
      // Увеличиваем счетчик попыток
      attemptCountRef.current += 1;
      
      // Если ошибка уже обработана или превышен лимит попыток, просто скрываем (предотвращаем цикл)
      if (errorHandledRef.current || attemptCountRef.current > 2) {
        setIsVisible(false);
        return;
      }
      
      // Помечаем ошибку как обработанную
      errorHandledRef.current = true;
      
      if (hideOnError) {
        // Скрываем изображение если hideOnError=true
        setIsVisible(false);
      } else {
        // Если hideOnError=false, пробуем fallback только ОДИН раз
        const fallbackUrl = fallback || fallbackImageUrl();
        // Проверяем что это первая попытка и fallback отличается от текущего src
        if (fallbackUrl && imageSrc !== fallbackUrl && attemptCountRef.current === 1 && !isFallbackActiveRef.current) {
          // Помечаем что используем fallback
          isFallbackActiveRef.current = true;
          // Сбрасываем флаг для fallback, чтобы он мог попытаться загрузиться
          errorHandledRef.current = false;
          // Устанавливаем fallback (это вызовет перерендер и попытку загрузить fallback)
          setImageSrc(fallbackUrl);
        } else {
          // Если fallback уже использован (isFallbackActiveRef.current === true) или это вторая попытка, скрываем
          setIsVisible(false);
        }
      }
    } catch (err) {
      // Игнорируем ошибки в обработчике
      setIsVisible(false);
    }
  };

  // Если изображение не должно быть видимо или нет валидного src, не рендерим
  if (!isVisible || !imageSrc || imageSrc.length === 0) {
    return null;
  }

  // Используем img напрямую, чтобы иметь прямой доступ к onerror
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        ...sx,
      }}
      {...(Object.keys(boxProps).reduce((acc, key) => {
        if (!['component', 'sx'].includes(key)) {
          (acc as any)[key] = (boxProps as any)[key];
        }
        return acc;
      }, {} as any))}
    >
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        loading={lazy ? 'lazy' : 'eager'}
        onError={handleError}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: sx?.objectFit || 'contain',
        }}
      />
    </Box>
  );
}

