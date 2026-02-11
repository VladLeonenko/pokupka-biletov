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
        setStoredCacheVersion(serverVersion);
        // Toast отключён: версия меняется при каждом pm2 restart (Date.now()),
        // что вызывало постоянные ложные «новая версия». Реальные обновления
        // отслеживает Service Worker.
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
