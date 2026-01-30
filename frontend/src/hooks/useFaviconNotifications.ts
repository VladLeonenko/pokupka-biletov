import { useEffect, useRef } from 'react';
import { setFaviconWithNotificationCount, resetFavicon } from '@/utils/faviconUpdater';

/**
 * Хук для обновления фавиконки на основе количества непрочитанных уведомлений
 * @param unreadCount - количество непрочитанных уведомлений
 * @param enabled - включено ли обновление фавиконки (по умолчанию true)
 * @param animated - анимировать ли фавиконку при наличии уведомлений (по умолчанию true)
 */
export function useFaviconNotifications(
  unreadCount: number,
  enabled: boolean = true,
  animated: boolean = true
): void {
  const previousCountRef = useRef<number>(0);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) {
      resetFavicon();
      return;
    }

    // Очищаем предыдущий таймаут анимации
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }

    // Определяем, есть ли новые уведомления (когда count увеличился)
    const hasNewNotifications = previousCountRef.current > 0 && unreadCount > previousCountRef.current;

    // Обновляем фавиконку
    if (unreadCount > 0) {
      // Анимируем только при появлении новых уведомлений
      const shouldAnimate = animated && hasNewNotifications;
      setFaviconWithNotificationCount(unreadCount, shouldAnimate);
      
      // Через 3 секунды останавливаем анимацию (оставляем просто бейдж с числом)
      if (shouldAnimate) {
        animationTimeoutRef.current = setTimeout(() => {
          setFaviconWithNotificationCount(unreadCount, false);
          animationTimeoutRef.current = null;
        }, 3000);
      }
    } else {
      resetFavicon();
    }

    previousCountRef.current = unreadCount;

    // Очистка таймаута при размонтировании
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [unreadCount, enabled, animated]);

}

