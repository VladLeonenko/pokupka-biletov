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
      this.logError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
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
    if (process.env.NODE_ENV === 'production') {
      this.sendToServer(error);
    }
  }

  private async sendToServer(error: ErrorInfo) {
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(error),
      });
    } catch (e) {
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

