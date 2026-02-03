import { useEffect } from 'react';
import { fetchCacheVersionFromServer, getStoredCacheVersion, setStoredCacheVersion } from '@/utils/cacheVersion';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 минут

/**
 * Хук для отслеживания версии кэша
 * ВРЕМЕННО ОТКЛЮЧЕН автоматический reload - вызывал проблемы с перезагрузкой страницы
 */
export const useCacheVersionWatcher = () => {
  useEffect(() => {
    let intervalId: number | null = null;

    const checkVersion = async () => {
      const serverVersion = await fetchCacheVersionFromServer();
      if (!serverVersion) {
        return;
      }
      const storedVersion = getStoredCacheVersion();
      if (!storedVersion) {
        // Первый раз - просто сохраняем версию
        setStoredCacheVersion(serverVersion);
        return;
      }
      
      if (storedVersion !== serverVersion) {
        // Вместо reload - просто логируем и обновляем версию
        // Пользователь сам обновит страницу когда нужно
        console.log('[CacheVersion] New version available:', serverVersion, '(current:', storedVersion, ')');
        setStoredCacheVersion(serverVersion);
        
        // Можно показать toast уведомление вместо автоматического reload
        if ((window as any).__showToast) {
          (window as any).__showToast('Доступна новая версия сайта. Обновите страницу для применения изменений.', 'info');
        }
      }
    };

    checkVersion();
    intervalId = window.setInterval(checkVersion, POLL_INTERVAL_MS);

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, []);
};
