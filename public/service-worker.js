// VimTractor Service Worker
// Strategy: Stale-While-Revalidate for seamless updates
// v3: Fix top boundary - lose life when going above visible screen
const CACHE_NAME = 'vimtractor-v3';
const APP_FILES = [
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
  '/js/input/InputHandler.js',
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

// Install: cache all app files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing new version...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => {
        console.log('[SW] All files cached');
        // Skip waiting - activate immediately
        return self.skipWaiting();
      })
  );
});

// Activate: clean old caches and take control
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Now controlling all pages');
        // Take control of all pages immediately
        return self.clients.claim();
      })
  );
});

// Fetch: Stale-While-Revalidate strategy
// 1. Return cached version immediately (fast!)
// 2. Fetch fresh version in background
// 3. Update cache for next time
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests (fonts, analytics, etc.)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        // Start fetching fresh version in background
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            // Only cache successful responses
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            // Network failed, that's ok - we have cache
            return null;
          });

        // Return cached version immediately, or wait for network
        return cachedResponse || fetchPromise;
      });
    })
  );
});

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
