const CACHE_NAME = 'vimtractor-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/main.js',
  '/js/config/GameConfig.js',
  '/js/game/Game.js',
  '/js/game/Grid.js',
  '/js/game/Tractor.js',
  '/js/game/Spawner.js',
  '/js/game/Collision.js',
  '/js/input/VimParser.js',
  '/js/render/Renderer.js',
  '/js/render/HUD.js',
  '/js/audio/SoundEngine.js',
  '/js/ui/SloganManager.js',
  '/js/utils/Constants.js',
  '/js/utils/Storage.js',
  '/js/utils/ThemeManager.js',
  '/data/slogans.json',
  '/manifest.json',
  '/icons/icon.svg'
];

// Install event - cache all resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('VimTractor: Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('VimTractor: Failed to cache:', error);
      })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('VimTractor: Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }

        return fetch(event.request).then((response) => {
          // Don't cache non-successful responses or non-GET requests
          if (!response || response.status !== 200 || event.request.method !== 'GET') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // If both cache and network fail, show offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      })
  );
});
