/**
 * Production-safe logger
 * В production режиме логи не выводятся в консоль для оптимизации и безопасности
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  error: (...args: any[]) => {
    // Ошибки логируем всегда, но можно отправлять в Sentry или другой сервис
    console.error(...args);
    
    // TODO: Отправить в Sentry или другой error tracking сервис
    // if (window.Sentry) {
    //   window.Sentry.captureException(args[0]);
    // }
  },

  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  table: (data: any) => {
    if (isDevelopment && console.table) {
      console.table(data);
    }
  },
};

// Для обратной совместимости экспортируем как default
export default logger;








