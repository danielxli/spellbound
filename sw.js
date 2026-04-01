const CACHE_NAME = 'spellbound-v5';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/dictionary.js',
  '/js/dice.js',
  '/js/storage.js',
  '/js/settings.js',
  '/js/audio.js',
  '/js/game.js',
  '/js/ui.js',
  '/words_filtered.txt',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first: try network, fall back to cache
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
