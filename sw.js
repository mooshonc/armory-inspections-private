// Service Worker - Self-destruct version
// This file unregisters itself and clears all caches

self.addEventListener('install', (event) => {
  console.log('[SW] Installing cleanup version...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating - cleaning up and unregistering...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('[SW] Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('[SW] All caches deleted. Unregistering...');
      return self.registration.unregister();
    }).then(() => {
      console.log('[SW] Successfully unregistered');
    })
  );
});

// Don't intercept any requests
self.addEventListener('fetch', (event) => {
  return;
});
