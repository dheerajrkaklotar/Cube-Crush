// Offline page + asset caching service worker for PWABuilder & Netlify
importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

const CACHE = "pwabuilder-page-v5";
const offlineFallbackPage = "/index.html";

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener('install', async (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll([
        offlineFallbackPage,
        '/manifest.json',
        '/pwa-192x192.png',
        '/pwa-512x512.png',
        '/pwa-maskable-512x512.png',
      ]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

if (typeof workbox !== 'undefined' && workbox.navigationPreload && workbox.navigationPreload.isSupported()) {
  workbox.navigationPreload.enable();
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const reqUrl = new URL(event.request.url);

  if (
    reqUrl.pathname.startsWith('/downloads/') ||
    reqUrl.pathname.endsWith('.zip') ||
    reqUrl.hostname.includes('googlesyndication.com') ||
    reqUrl.hostname.includes('doubleclick.net') ||
    reqUrl.hostname.includes('google.com')
  ) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preloadResp = await event.preloadResponse;
        if (preloadResp) {
          return preloadResp;
        }
        const networkResp = await fetch(event.request);
        return networkResp;
      } catch (error) {
        const cache = await caches.open(CACHE);
        const cachedResp = await cache.match(offlineFallbackPage);
        return cachedResp;
      }
    })());
  }
});
