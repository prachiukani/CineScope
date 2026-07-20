const SHELL_CACHE = 'cinescope-shell-v8';
const IMAGE_CACHE = 'cinescope-images-v1';
const API_CACHE = 'cinescope-api-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './styles/main.css',
  './js/config.js',
  './js/api.js',
  './js/router.js',
  './js/store.js',
  './js/utils.js',
  './js/main.js',
  './js/ui/home.js',
  './js/ui/search.js',
  './js/ui/details.js',
  './js/ui/person.js',
  './js/ui/watchlist.js',
  './js/ui/components/card.js',
  './js/ui/components/skeleton.js',
  './js/ui/components/modal.js',
  './manifest.webmanifest',
  './assets/icons/cinescope.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys
    .filter((key) => ![SHELL_CACHE, IMAGE_CACHE, API_CACHE].includes(key))
    .map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  const refresh = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || refresh;
}

async function networkFirst(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error('No network or cached API response available.');
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === 'https://image.tmdb.org') event.respondWith(staleWhileRevalidate(request));
  else if (url.origin === 'https://api.themoviedb.org') event.respondWith(networkFirst(request));
  else if (url.origin === self.location.origin) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
  }
});
