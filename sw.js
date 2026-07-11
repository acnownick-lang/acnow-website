const CACHE_NAME = 'acnow-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/contact.html',
  '/about.html',
  '/services.html',
  '/pool-heating.html',
  '/areas.html',
  '/redesign.css',
  '/app.js',
  '/downloaded_images/Logo2.webp',
  '/downloaded_images/split_res_repair.jpg',
  '/downloaded_images/split_res_install.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Cache-First for static assets/images
  if (STATIC_ASSETS.includes(url.pathname) || url.pathname.includes('/downloaded_images/')) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        return cachedResponse || fetch(event.request).then(networkResponse => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // Stale-While-Revalidate for HTML requests
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request)
        .then(networkResponse => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('/contact.html');
        });
      return cachedResponse || fetchPromise;
    })
  );
});
