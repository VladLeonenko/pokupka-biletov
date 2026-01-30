import { useQuery } from '@tanstack/react-query';
import { listNotifications } from '@/services/cmsApi';
import { Notification } from '@/types/cms';
import { useAuth } from '@/auth/AuthProvider';
import { useFaviconNotifications } from '@/hooks/useFaviconNotifications';

/**
 * Компонент для отслеживания уведомлений и обновления фавиконки
 * Работает глобально для всех авторизованных пользователей (админ и клиент)
 */
export function FaviconNotificationTracker() {
  const { token } = useAuth();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications', 'unread', 'favicon'],
    queryFn: async () => {
      try {
        return await listNotifications(true);
      } catch (error: any) {
        // Тихая обработка ошибок авторизации
        if (error?.message?.includes('Authentication required') || error?.message?.includes('401')) {
          return [];
        }
        throw error;
      }
    },
    enabled: !!token,
    refetchInterval: !!token ? 30000 : false,
    retry: false,
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Обновляем фавиконку на основе количества уведомлений
  useFaviconNotifications(unreadCount, !!token, true);

  return null; // Компонент не рендерит ничего
}

