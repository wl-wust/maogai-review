const CACHE_NAME = 'maogai-review-v2';
const APP_ASSETS = [
  './',
  './index.html',
  './css/app.css',
  './js/app.js',
  './js/core.js',
  './js/search.js',
  './js/quiz.js',
  './js/recite.js',
  './js/ui.js',
  './js/views/home.js',
  './js/views/knowledge.js',
  './js/views/quiz.js',
  './js/views/recite.js',
  './js/views/favorites.js',
  './data/questions.js',
  './data/knowledge.js',
  './data/subjective.js',
  './assets/vendor/lucide.min.js',
  './assets/icon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((cached) => cached ?? fetch(event.request))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response.ok || new URL(event.request.url).origin !== self.location.origin) {
          return response;
        }
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
