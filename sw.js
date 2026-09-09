// Minimal offline app-shell cache. Bump CACHE_NAME any time one of the
// cached files changes so the next visit picks up the new version instead
// of serving a stale one forever.
const CACHE_NAME = "notes-app-v4";

const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.webmanifest",
  "./images/wallpaper.png",
  "./images/icons1.png",
  "./images/icons2.png",
  "./images/icons3.png",
  "./images/app-logo.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-192-maskable.png",
  "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Cache-first: this is a single-user, mostly-static app (all real data lives
// in localStorage, not on any server), so once the shell is cached there's
// no reason to hit the network for it again. Falls back to the network for
// anything not pre-cached, and re-caches whatever that fetch returns so it
// works offline from then on too.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
