// Утилита для версионирования статических файлов (cache busting)

// Версия берется из package.json или из переменной окружения
// При сборке Vite автоматически добавляет хеши к именам файлов
// Эта утилита используется для ручного управления версиями

const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';
const BUILD_TIMESTAMP = import.meta.env.VITE_BUILD_TIMESTAMP || Date.now().toString();

// Ключ для хранения версии кэша в localStorage
export const CACHE_VERSION_KEY = 'cache_version';

/**
 * Генерирует версионированный URL для статического ресурса
 * @param url - URL ресурса
 * @param useTimestamp - использовать timestamp вместо версии
 */
export function getVersionedUrl(url: string, useTimestamp: boolean = false): string {
  if (!url) return url;
  
  // Если URL уже содержит версию или хеш, возвращаем как есть
  if (url.includes('?v=') || url.includes('?hash=') || url.match(/[a-f0-9]{8,}\./)) {
    return url;
  }
  
  const version = useTimestamp ? BUILD_TIMESTAMP : APP_VERSION;
  const separator = url.includes('?') ? '&' : '?';
  
  return `${url}${separator}v=${version}`;
}

/**
 * Получить текущую версию приложения
 */
export function getAppVersion(): string {
  return APP_VERSION;
}

/**
 * Получить timestamp сборки
 */
export function getBuildTimestamp(): string {
  return BUILD_TIMESTAMP;
}

/**
 * Обновить версию в localStorage для принудительного обновления кэша
 */
export function updateCacheVersion(): void {
  localStorage.setItem('app_cache_version', APP_VERSION);
  localStorage.setItem('app_build_timestamp', BUILD_TIMESTAMP);
}

/**
 * Проверить, нужно ли обновить кэш
 */
export function shouldUpdateCache(): boolean {
  const cachedVersion = localStorage.getItem('app_cache_version');
  const cachedTimestamp = localStorage.getItem('app_build_timestamp');
  
  return cachedVersion !== APP_VERSION || cachedTimestamp !== BUILD_TIMESTAMP;
}

/**
 * Получить сохраненную версию кэша из localStorage
 */
export function getStoredCacheVersion(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return localStorage.getItem(CACHE_VERSION_KEY);
  } catch {
    return null;
  }
}

/**
 * Сохранить версию кэша в localStorage
 */
export function setStoredCacheVersion(version: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(CACHE_VERSION_KEY, version);
  } catch {
    // Игнорируем ошибки записи в localStorage
  }
}

/**
 * Получить версию кэша с сервера
 */
import { getApiBase } from './apiBase';

export async function fetchCacheVersionFromServer(): Promise<string | null> {
  try {
    // Вычисляем динамически при каждом вызове
    const apiBase = getApiBase();
    
    const response = await fetch(`${apiBase}/api/public/cache/version`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-cache',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data?.version || null;
  } catch (error) {
    console.warn('[cacheVersion] Failed to fetch cache version from server:', error);
    return null;
  }
}
