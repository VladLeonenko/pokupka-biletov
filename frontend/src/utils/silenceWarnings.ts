/**
 * Отключаем определенные предупреждения в режиме разработки
 * В production полностью убираем console.log/info/warn/debug для оптимизации
 */

// Подавляем ошибки WebSocket в продакшене (когда Vite dev server не запущен)
if (typeof window !== 'undefined') {
  // Обрабатываем ошибки WebSocket через window.onerror
  window.addEventListener('error', (event) => {
    if (event.message?.includes('WebSocket') && 
        (event.message?.includes('localhost:5173') || event.message?.includes('ws://'))) {
      event.preventDefault();
      return false;
    }
  }, true);
  
  // Обрабатываем ошибки через window.addEventListener('unhandledrejection')
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.toString() || '';
    if (reason.includes('WebSocket') && 
        (reason.includes('localhost:5173') || reason.includes('ws://'))) {
      event.preventDefault();
    }
  });
}

// В production режиме полностью отключаем лишние логи
if (!import.meta.env.DEV) {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.warn = noop;
  console.debug = noop;
  
  // В продакшене фильтруем ошибки WebSocket
  const origError = console.error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.error = function (...args: any[]) {
    const msg = String(args[0] || '');
    
    // Игнорируем ошибки WebSocket в продакшене
    if (msg.includes('WebSocket') && 
        (msg.includes('localhost:5173') || msg.includes('ws://'))) {
      return;
    }
    
    return origError.apply(console, args as unknown as [unknown, ...unknown[]]);
  } as typeof console.error;
} else {
  // В development режиме фильтруем известные безопасные предупреждения
  const origError = console.error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.error = function (...args: any[]) {
    const msg = String(args[0] || '');
    
    // Игнорируем известные безопасные ошибки
    if (
      msg.includes('findDOMNode is deprecated') ||
      msg.includes('ResizeObserver loop completed with undelivered notifications') ||
      msg.includes('ResizeObserver loop limit exceeded') ||
      (msg.includes('WebSocket') && msg.includes('localhost:5173'))
    ) {
      return;
    }
    
    return origError.apply(console, args as unknown as [unknown, ...unknown[]]);
  } as typeof console.error;
}

export {};
