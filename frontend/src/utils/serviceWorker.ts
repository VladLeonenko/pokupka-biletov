// Утилиты для регистрации и управления Service Worker

const isProduction = import.meta.env.PROD;

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

        // Проверяем обновления каждые 5 минут
        setInterval(() => {
          try {
            registration?.update?.();
          } catch (_) {
            // Игнорируем newestWorker is null и подобные гонки
          }
        }, 5 * 60 * 1000);

        // Обработка обновления Service Worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration?.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            try {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[Service Worker] New version available');
                if ((window as any).__showToast) {
                  (window as any).__showToast('Доступна новая версия. Обновите страницу.', 'info');
                }
              }
            } catch (_) {
              // Игнорируем гонки при смене SW
            }
          });
        });
      })
      .catch((error) => {
        console.error('[Service Worker] Registration failed:', error);
      });
  });

  // ОТКЛЮЧЕНО: автоматический reload при смене контроллера
  // Это вызывало проблемы с неожиданной перезагрузкой страницы
  // navigator.serviceWorker.addEventListener('controllerchange', () => {
  //   window.location.reload();
  // });
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
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return;
    await registration.update();
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  } catch (_) {
    // Игнорируем newestWorker is null и подобные гонки
  }
}
