/**
 * Na und? – Service Worker
 * Offline-Support: Network-first mit Cache-Fallback
 */
const CACHE = 'naund-v7';
const STATIC = [
  '/morgenpost/',
  '/morgenpost/manifest.json',
  '/morgenpost/app.js',
  '/morgenpost/app.css',
  '/morgenpost/icons/icon-192.png',
  '/morgenpost/icons/icon-512.png',
];

// Install: statische Assets cachen
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC))
      .then(() => self.skipWaiting())
  );
});

// Activate: alte Caches löschen
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: Network-first, Cache-Fallback
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (!url.pathname.startsWith('/morgenpost')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request)
        .then(cached => cached || new Response(
          '<h2 style="font-family:serif;padding:40px">Na und? ist offline.<br><small>Beim nächsten Start wird die letzte Ausgabe geladen.</small></h2>',
          { headers: { 'Content-Type': 'text/html' } }
        ))
      )
  );
});

// Push-Benachrichtigung empfangen
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'Na und?', {
      body:  data.body  || 'Eine neue Ausgabe ist erschienen.',
      icon:  '/morgenpost/icons/icon-192.png',
      badge: '/morgenpost/icons/icon-192.png',
      data:  { url: data.url || '/morgenpost/' },
      vibrate: [200, 100, 200],
    })
  );
});

// Klick auf Notification → App öffnen
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = e.notification.data?.url || '/morgenpost/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(wins => {
        const match = wins.find(w => w.url.includes('/morgenpost'));
        if (match) return match.focus();
        return clients.openWindow(target);
      })
  );
});
