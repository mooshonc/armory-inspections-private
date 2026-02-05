// sw.js — Stable PWA Service Worker (Network-first for navigations)

const VERSION = 'v1.0.0';               // 🔁 תעלה מספר בכל פריסה
const CACHE_STATIC = `static-${VERSION}`;
const CACHE_PAGES  = `pages-${VERSION}`;

// שים כאן דברים שאתה בטוח שקיימים תמיד בשורש
const PRECACHE_URLS = [
  '/',                 // ניווט לשורש
  '/index.html',
  '/manifest.json',
  // '/icons/icon-192.png',
  // '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // מחיקת caches ישנים לפי גרסה
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => ![CACHE_STATIC, CACHE_PAGES].includes(k))
        .map((k) => caches.delete(k))
    );

    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // רק GET
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // לא לגעת בבקשות ל-Firebase/IdentityToolkit וכו' (שהכל יישאר רשת רגילה)
  // תוסיף כאן דומיינים נוספים אם צריך
  const BYPASS_HOSTS = [
    'identitytoolkit.googleapis.com',
    'securetoken.googleapis.com',
    'firebasedatabase.app',
    'firebaseio.com',
    'googleapis.com',
    'gstatic.com',
  ];
  if (BYPASS_HOSTS.some((h) => url.hostname.includes(h))) {
    return; // דפדפן ימשיך כרגיל לרשת
  }

  // ניווטים (דפים) — Network First כדי לא להיתקע על index ישן
  const isNavigation = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isNavigation) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_PAGES);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        // Offline fallback: מה שיש בקאש
        const cached = await caches.match(req);
        return cached || caches.match('/index.html');
      }
    })());
    return;
  }

  // סטטיים (js/css/images/fonts) — Stale-While-Revalidate
  const isStatic =
    ['script', 'style', 'image', 'font'].includes(req.destination) ||
    /\.(js|css|png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(url.pathname);

  if (isStatic) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      const fetchPromise = fetch(req).then(async (res) => {
        const cache = await caches.open(CACHE_STATIC);
        cache.put(req, res.clone());
        return res;
      }).catch(() => null);

      return cached || (await fetchPromise) || Response.error();
    })());
    return;
  }

  // כל השאר — רשת רגילה
});
