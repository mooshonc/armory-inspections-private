const CACHE_NAME = 'armory-inspections-v1';
const urlsToCache = [
  '/armory-inspections/',
  '/armory-inspections/index.html',
  '/armory-inspections/armory.html',
  '/armory-inspections/armon.html',
  '/armory-inspections/tech.html',
  '/armory-inspections/manifest.json',
  '/armory-inspections/Heebo-Regular.ttf',
  '/armory-inspections/EFT_Aderet.ttf',
  '/armory-inspections/armon_inspection_template.pdf',
  '/armory-inspections/tech_inspection_template.pdf',
  '/armory-inspections/armory_fresh_template.pdf'
];

// Install - cache files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Activate - clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
