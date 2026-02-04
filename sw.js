// Service Worker for Armory Inspections
// Version: 1.0.0 - שנה את המספר בכל עדכון!

const CACHE_VERSION = 'armory-inspections-v1';
const urlsToCache = [];

// Install event - activate immediately
self.addEventListener('install', (event) => {
  console.log('[SW] Installing version:', CACHE_VERSION);
  self.skipWaiting(); // Take control immediately
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating version:', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_VERSION) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all pages
  );
});

// Fetch event - Network first strategy for HTML files
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // For HTML files - always fetch from network first
  if (event.request.destination === 'document' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone the response before caching
          const responseToCache = response.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // For other files - cache first
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
