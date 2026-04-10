// PrimeCoder SW v2: только сеть, без cache-first по /assets (хэши меняются при каждом билде).
// Старый cache-first ломал загрузку CSS/JS после деплоя.

const SW_VERSION = 'v2-passthrough';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request));
});
