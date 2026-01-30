// Утилиты для регистрации и управления Service Worker

const isProduction = process.env.NODE_ENV === 'production';

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !isProduction) {
    console.log('[Service Worker] Not supported or not in production');
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[Service Worker] Registered:', registration.scope);

        // Проверяем обновления каждые 60 секунд
        setInterval(() => {
          registration.update();
        }, 60000);

        // Обработка обновления Service Worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Новый Service Worker установлен, можно обновить страницу
                console.log('[Service Worker] New version available');
                // Можно показать уведомление пользователю
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('[Service Worker] Registration failed:', error);
      });
  });

  // Обработка контроллера Service Worker
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

// Функция для кэширования URL по требованию
export async function cacheUrls(urls: string[]) {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    return;
  }

  navigator.serviceWorker.controller.postMessage({
    type: 'CACHE_URLS',
    urls,
  });
}

// Функция для принудительного обновления Service Worker
export async function updateServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (registration) {
    await registration.update();
    
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }
}






