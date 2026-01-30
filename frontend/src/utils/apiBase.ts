/**
 * Утилита для получения базового URL API
 * 
 * Логика:
 * - Если задан VITE_API_URL - используем его (но убираем /api если он есть, т.к. /api добавляется в сервисах)
 * - В dev режиме - пустая строка (проксируется через Vite)
 * - В production - пустая строка (относительные пути)
 * 
 * ВАЖНО: Эта функция возвращает базовый URL БЕЗ /api, т.к. /api добавляется в каждом сервисе
 */
export function getApiBase(): string {
  // Проверяем явно заданную переменную окружения
  const explicitBase = (import.meta as any)?.env?.VITE_API_URL;
  if (explicitBase && typeof explicitBase === 'string' && explicitBase.trim().length > 0) {
    let base = explicitBase.trim().replace(/\/+$/, ''); // Убираем trailing slash
    
    // Если VITE_API_URL содержит /api, убираем его, т.к. /api добавляется в сервисах
    // Например: /api -> '', https://example.com/api -> https://example.com
    if (base.endsWith('/api')) {
      base = base.slice(0, -4);
    }
    
    return base;
  }

  // В dev режиме используем пустую строку (проксируется через Vite)
  if (import.meta.env.DEV) {
    return '';
  }

  // В production используем пустую строку для относительных путей
  // Это работает когда frontend и backend на одном домене
  // /api добавляется в каждом сервисе
  return '';
}

/**
 * Получить абсолютный URL для API (если нужен)
 * Используется в редких случаях, когда нужен полный URL
 * ВАЖНО: Возвращает URL БЕЗ /api, т.к. /api добавляется в сервисах
 */
export function getApiBaseAbsolute(): string {
  const explicitBase = (import.meta as any)?.env?.VITE_API_URL;
  if (explicitBase && typeof explicitBase === 'string' && explicitBase.trim().length > 0) {
    let base = explicitBase.trim().replace(/\/+$/, '');
    
    // Если VITE_API_URL содержит /api, убираем его
    if (base.endsWith('/api')) {
      base = base.slice(0, -4);
    }
    
    return base;
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:3000';
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return '';
}
