/**
 * Утилита для получения базового URL API
 * 
 * Логика:
 * - Если задан VITE_API_URL - используем его
 * - В dev режиме - пустая строка (проксируется через Vite)
 * - В production - пустая строка (относительные пути) или window.location.origin если нужен абсолютный URL
 */
export function getApiBase(): string {
  // Проверяем явно заданную переменную окружения
  const explicitBase = (import.meta as any)?.env?.VITE_API_URL;
  if (explicitBase && typeof explicitBase === 'string' && explicitBase.trim().length > 0) {
    return explicitBase.trim().replace(/\/+$/, ''); // Убираем trailing slash
  }

  // В dev режиме используем пустую строку (проксируется через Vite)
  if (import.meta.env.DEV) {
    return '';
  }

  // В production используем пустую строку для относительных путей
  // Это работает когда frontend и backend на одном домене
  // Если нужен абсолютный URL, можно использовать window.location.origin
  // Но для большинства случаев относительные пути лучше
  return '';
}

/**
 * Получить абсолютный URL для API (если нужен)
 * Используется в редких случаях, когда нужен полный URL
 */
export function getApiBaseAbsolute(): string {
  const explicitBase = (import.meta as any)?.env?.VITE_API_URL;
  if (explicitBase && typeof explicitBase === 'string' && explicitBase.trim().length > 0) {
    return explicitBase.trim().replace(/\/+$/, '');
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:3000';
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return '';
}
