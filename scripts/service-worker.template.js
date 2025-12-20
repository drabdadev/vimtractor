// VimTractor Service Worker
// Auto-generated - DO NOT EDIT DIRECTLY
// Edit scripts/service-worker.template.js instead
// Version: {{VERSION}}

const CACHE_NAME = 'vimtractor-{{VERSION}}';
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
  console.log('[SW] Installing version {{VERSION}}...');
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

// Activate: clean old caches, take control, and reload clients
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating version {{VERSION}}...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('vimtractor-') && name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Now controlling all pages');
        return self.clients.claim();
      })
      .then(() => {
        // Force reload all clients to get fresh content
        return self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => {
            console.log('[SW] Reloading client for update');
            client.postMessage({ type: 'RELOAD_FOR_UPDATE', version: '{{VERSION}}' });
          });
        });
      })
  );
});

// Fetch: Network-first for ALL files (ensures users always get latest version)
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  // Skip API requests - always fetch from network without caching
  if (event.request.url.includes('/api/')) return;

  // Network-first strategy for ALL files
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache the fresh response for offline use
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline fallback - serve from cache
        return caches.match(event.request);
      })
  );
});

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
