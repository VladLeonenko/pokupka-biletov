/**
 * Простая система мониторинга ошибок
 * 
 * В будущем можно подключить Sentry:
 * npm install @sentry/react
 * https://docs.sentry.io/platforms/javascript/guides/react/
 */

export interface ErrorInfo {
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  userAgent: string;
  timestamp: string;
}

class ErrorMonitoring {
  private errors: ErrorInfo[] = [];
  private maxErrors = 50;

  init() {
    // Отлавливаем глобальные JS ошибки
    window.addEventListener('error', (event) => {
      this.logError({
        message: event.message,
        stack: event.error?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
    });

    // Отлавливаем необработанные Promise rejection
    window.addEventListener('unhandledrejection', (event) => {
      const msg = String(event.reason ?? '');
      // Игнорируем безвредные SW-гонки (newestWorker is null при обновлении)
      if (msg.includes('newestWorker is null')) {
        event.preventDefault();
        return;
      }
      this.logError({
        message: `Unhandled Promise Rejection: ${msg}`,
        stack: event.reason?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
    });

  }

  logError(error: ErrorInfo) {
    this.errors.push(error);
    
    // Ограничиваем количество сохраненных ошибок
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Логируем в консоль для разработки
    console.error('[ErrorMonitoring]', error);

    // В продакшене можно отправлять на сервер
    // Используем import.meta.env.PROD для Vite
    if (typeof window !== 'undefined' && (import.meta as any).env?.PROD) {
      this.sendToServer(error);
    }
  }

  private async sendToServer(error: ErrorInfo) {
    try {
      // Проверяем, что endpoint существует перед отправкой
      // Если endpoint не реализован, просто логируем в консоль
      const response = await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(error),
      });
      
      // Если endpoint не существует (404), просто игнорируем
      if (!response.ok && response.status === 404) {
        console.warn('[ErrorMonitoring] Endpoint /api/errors не реализован, ошибка не отправлена');
        return;
      }
    } catch (e) {
      // Игнорируем ошибки отправки - не критично
      console.warn('[ErrorMonitoring] Не удалось отправить ошибку на сервер', e);
    }
  }

  getErrors(): ErrorInfo[] {
    return [...this.errors];
  }

  clearErrors() {
    this.errors = [];
  }
}

export const errorMonitoring = new ErrorMonitoring();

