const CACHE_NAME = 'newssphere-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('PWA Service Worker: Pre-caching Core App Shell Assets');
      try {
        await cache.addAll(ASSETS_TO_CACHE);
      } catch (err) {
        console.warn('PWA Service Worker: Pre-cache warning:', err);
      }
    })
  );
  self.skipWaiting();
});

// Activate Service Worker & Clean Old Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('PWA Service Worker: Clearing obsolete cache store:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Cache first, Network fallback strategy for static assets
self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip non-HTTP(S) schemas
  if (!url.protocol.startsWith('http')) return;

  // Skip API queries or socket.io connection queries
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(async () => {
          // Guarantee valid Response return for fetch errors
          if (event.request.mode === 'navigate') {
            const indexShell = await caches.match('/index.html');
            if (indexShell) return indexShell;
          }
          return new Response('Network error or offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        });
    })
  );
});
