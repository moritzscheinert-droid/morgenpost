/**
 * Na und? — Service Worker
 * Cache-First für statische Assets · Network-First für HTML · Offline-Fallback
 */
const CACHE   = 'naund-v14';
const OFFLINE = '/morgenpost/offline.html';
const MAX_ISSUES = 10;

const STATIC = [
  '/morgenpost/',
  '/morgenpost/offline.html',
  '/morgenpost/manifest.json',
  '/morgenpost/app.js',
  '/morgenpost/app.css',
  '/morgenpost/utility-bar.css',
  '/morgenpost/settings-init.js',
  '/morgenpost/settings-panel.js',
  '/morgenpost/audio-player.js',
  '/morgenpost/install-prompt.js',
  '/morgenpost/design-tokens.css',
  '/morgenpost/archive-layout.css',
  '/morgenpost/article-layout.css',
  '/morgenpost/print.css',
  '/morgenpost/favicon.svg',
  '/morgenpost/icons/icon-192.png',
  '/morgenpost/icons/icon-512.png',
];

// ── Install: statische Assets vorlädt ────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: alte Cache-Versionen löschen ───────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (!url.pathname.startsWith('/morgenpost')) return;

  // Fonts & GSAP CDN: Cache-First
  if (url.hostname !== location.hostname) {
    e.respondWith(cacheFirst(e.request));
    return;
  }

  // HTML: Network-First mit Offline-Fallback
  if (e.request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(networkFirstHtml(e.request));
    return;
  }

  // Alles andere (CSS, JS, Bilder, Fonts lokal): Cache-First
  e.respondWith(cacheFirst(e.request));
});

async function networkFirstHtml(req) {
  try {
    const res = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(CACHE);
      cache.put(req, res.clone());
      // Ausgaben-Cache auf MAX_ISSUES begrenzen
      if (req.url.includes('/issues/') && req.url.endsWith('.html')) {
        await trimIssueCache(cache);
      }
    }
    return res;
  } catch {
    const cached = await caches.match(req);
    return cached || (await caches.match(OFFLINE)) ||
      new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } });
  }
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(CACHE);
      cache.put(req, res.clone());
    }
    return res;
  } catch {
    return new Response('', { status: 503 });
  }
}

async function trimIssueCache(cache) {
  const keys = (await cache.keys())
    .filter(r => r.url.includes('/issues/') && r.url.endsWith('.html'))
    .sort((a, b) => a.url.localeCompare(b.url));
  if (keys.length > MAX_ISSUES) {
    await Promise.all(keys.slice(0, keys.length - MAX_ISSUES).map(k => cache.delete(k)));
  }
}

// ── Push-Benachrichtigungen ───────────────────────────────────────────────────
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'Na und?', {
      body:    data.body  || 'Eine neue Ausgabe ist erschienen.',
      icon:    '/morgenpost/icons/icon-192.png',
      badge:   '/morgenpost/icons/icon-192.png',
      data:    { url: data.url || '/morgenpost/' },
      vibrate: [200, 100, 200],
    })
  );
});

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
