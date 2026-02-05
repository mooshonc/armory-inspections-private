// sw.js — Force-refresh + sane caching (Network-first for navigations)
// Deploy this file as /sw.js (overwrite the old one)

const VERSION = '2026-02-05_v1';
const CACHE_STATIC = `static-${VERSION}`;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  // Do NOT precache index.html here — we want navigations to always hit the network when possible.
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => cache.addAll([
      '/manifest.json',
      // Add icons here if you want, e.g.:
      // '/icons/icon-192.png',
      // '/icons/icon-512.png',
    ]).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Drop ALL old caches (this fixes "installed app stuck on old index")
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));

    await self.clients.claim();

    // Hard-refresh open clients so they fetch the new index.html from the network
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.all(clients.map(async (client) => {
      try {
        // navigate() triggers a reload of the controlled page
        if (client.url) await client.navigate(client.url);
      } catch (_) {}
    }));
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never intercept Firebase/Google auth/data calls
  const BYPASS_HOSTS = [
    'identitytoolkit.googleapis.com',
    'securetoken.googleapis.com',
    'firebasedatabase.app',
    'firebaseio.com',
    'googleapis.com',
    'gstatic.com',
  ];
  if (BYPASS_HOSTS.some((h) => url.hostname.includes(h))) return;

  const accept = req.headers.get('accept') || '';
  const isNavigation = req.mode === 'navigate' || accept.includes('text/html');

  if (isNavigation) {
    // ✅ Network-first (and prefer fresh HTML). Prevent "stuck" installed versions.
    event.respondWith((async () => {
      try {
        const res = await fetch(req, { cache: 'no-store' });
        return res;
      } catch (e) {
        // Offline fallback: try cached index if exists
        const cached = await caches.match('/index.html');
        return cached || Response.error();
      }
    })());
    return;
  }

  // Static assets: stale-while-revalidate
  const isStatic =
    ['script', 'style', 'image', 'font'].includes(req.destination) ||
    /\.(js|css|png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(url.pathname);

  if (isStatic) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      const fetchPromise = fetch(req).then(async (res) => {
        try {
          const cache = await caches.open(CACHE_STATIC);
          cache.put(req, res.clone());
        } catch (_) {}
        return res;
      }).catch(() => null);

      return cached || (await fetchPromise) || Response.error();
    })());
    return;
  }

  // Default: network
});
