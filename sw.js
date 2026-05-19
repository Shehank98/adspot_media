const CACHE_VERSION = 'adspot-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

const STATIC_ASSETS = [
  '/admin/',
  '/admin/index.html',
  '/admin/dashboard.html',
  '/css/styles.css',
  '/css/pwa.css',
  '/js/config.js',
  '/js/admin.js',
  '/js/supabase.js',
  '/js/admin-customers.js',
  '/js/admin-promo-codes.js',
  '/images/icon-192.svg',
  '/images/icon-512.svg',
  '/images/favicon.svg',
];

const NEVER_CACHE = [
  'supabase.co',
  'googleapis.com',
  'payhere.lk',
  'firebaseapp.com',
  'firebase.google.com',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Some assets failed to cache:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('adspot-') && k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, non-http, and API/external calls
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;
  if (NEVER_CACHE.some((domain) => url.hostname.includes(domain))) return;

  // For HTML pages: network-first, cache as fallback
  if (request.headers.get('Accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then((c) => c.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/admin/')))
    );
    return;
  }

  // For static assets (CSS, JS, images, fonts): cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((c) => c.put(request, clone));
        }
        return response;
      });
    })
  );
});

// Background sync for offline actions (future extension point)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'GET_VERSION') {
    event.source?.postMessage({ type: 'VERSION', version: CACHE_VERSION });
  }
});

// Push notification from Netlify Function (payment confirmed)
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'AdSpot Admin';
  const options = {
    body: data.body || 'New activity',
    icon: '/images/icon-192.svg',
    badge: '/images/icon-72.svg',
    tag: 'adspot-payment',
    renotify: true,
    data: { url: data.url || '/admin/dashboard.html' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Tap on notification → open admin dashboard
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/admin/dashboard.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.includes('/admin/'));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
