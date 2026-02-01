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
 * В production всегда возвращает пустую строку для относительных путей
 */
export function getApiBaseAbsolute(): string {
  // В production всегда используем пустую строку (относительные пути)
  // Это работает когда frontend и backend на одном домене
  // Vite заменит import.meta.env.PROD на true в production build
  if (import.meta.env.PROD) {
    return '';
  }

  const explicitBase = (import.meta as any)?.env?.VITE_API_URL;
  if (explicitBase && typeof explicitBase === 'string' && explicitBase.trim().length > 0) {
    let base = explicitBase.trim().replace(/\/+$/, '');
    
    // Если VITE_API_URL содержит /api, убираем его
    if (base.endsWith('/api')) {
      base = base.slice(0, -4);
    }
    
    return base;
  }

  // В dev режиме используем localhost:3000
  // Этот код будет удален Vite в production build благодаря проверке PROD выше
  return 'http://localhost:3000';
}
