// Service Worker для офлайн кэширования и оптимизации производительности
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `primecoder-cache-${CACHE_VERSION}`;

// Ресурсы для кэширования при установке
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/assets/index.css',
  '/assets/index.js',
];

// Стратегии кэширования
const CACHE_STRATEGIES = {
  // Кэш-первый для статических ресурсов
  CACHE_FIRST: 'cache-first',
  // Сеть-первая для API запросов
  NETWORK_FIRST: 'network-first',
  // Stale-while-revalidate для HTML
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
};

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        // Кэшируем только критичные ресурсы при установке
        return cache.addAll(STATIC_CACHE_URLS.filter(url => {
          // Проверяем существование URL (в production будут реальные пути)
          return true;
        })).catch(err => {
          console.warn('[Service Worker] Some assets failed to cache:', err);
          // Не блокируем установку если некоторые ресурсы не закэшировались
        });
      })
      .then(() => {
        // Принудительно активируем новый Service Worker
        return self.skipWaiting();
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...', CACHE_VERSION);
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Удаляем старые кэши
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Берем контроль над всеми клиентами
      return self.clients.claim();
    })
  );
});

// Обработка запросов
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Пропускаем не-GET запросы
  if (request.method !== 'GET') {
    return;
  }

  // Пропускаем chrome-extension и другие протоколы
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Стратегия для статических ресурсов (JS, CSS, изображения, шрифты)
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/legacy/') ||
    url.pathname.startsWith('/img/') ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|eot)$/i)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Стратегия для HTML (stale-while-revalidate)
  if (
    url.pathname === '/' ||
    url.pathname.endsWith('.html') ||
    request.headers.get('accept')?.includes('text/html')
  ) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Стратегия для API запросов (network-first)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // По умолчанию пробуем сеть, затем кэш
  event.respondWith(networkFirst(request));
});

// Стратегия: кэш-первый (для статических ресурсов)
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[Service Worker] Fetch failed:', error);
    // Возвращаем fallback если есть
    return new Response('Offline', { status: 503 });
  }
}

// Стратегия: сеть-первая (для API)
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Кэшируем только успешные ответы
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[Service Worker] Network failed, trying cache:', error);
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    return new Response('Offline', { status: 503 });
  }
}

// Стратегия: stale-while-revalidate (для HTML)
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  // Запускаем обновление в фоне
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => {
    // Игнорируем ошибки фонового обновления
  });
  
  // Возвращаем кэш сразу, если есть
  if (cached) {
    return cached;
  }
  
  // Если кэша нет, ждем сеть
  return fetchPromise;
}

// Обработка сообщений от клиента
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = event.data.urls || [];
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(urls);
      })
    );
  }
});






