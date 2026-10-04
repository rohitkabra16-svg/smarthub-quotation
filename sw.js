/* Smart Hub service worker.
   Network first, cache as the fallback. That ordering matters: a price update you
   upload must show immediately, so we always try the server before the cache.
   The cache only steps in when the shop connection is down or slow. */

const CACHE = 'smarthub-v3';
const FILES = [
  './',
  './index.html',
  './quotation.html',
  './prices.html',
  './orders.html',
  './catalog.js',
  './html2pdf.bundle.min.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(FILES))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())   // one missing file must not block install
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Only our own files; never touch the Google Sheet sync or anything off-site.
  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});
