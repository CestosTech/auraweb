// AURA Monrovia Food Delivery Service Worker
const CACHE_NAME = "aura-monrovia-v9-dev-safe";
const MEDIA_IMAGE_CACHE = "aura-public-images-v1";
const MEDIA_VIDEO_CACHE = "aura-public-videos-v1";
const MEDIA_META_CACHE = "aura-public-media-meta-v1";
const MEDIA_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
const MEDIA_MAX_AGE_VIDEO_MS = 7 * 24 * 60 * 60 * 1000;
const MEDIA_MAX_IMAGES = 240;
const MEDIA_MAX_VIDEOS = 12;
const MAX_CACHEABLE_VIDEO_BYTES = 8 * 1024 * 1024;
const LOCAL_DEVELOPMENT = ['localhost', '127.0.0.1', '[::1]'].includes(self.location.hostname);
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/aura-icon-32.png",
  "/apple-touch-icon.png",
  "/icons/Icon-192.png",
  "/icons/Icon-512.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  if (LOCAL_DEVELOPMENT) { self.skipWaiting(); return; }
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("Pre-caching assets notice:", err);
      });
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key.startsWith("aura-monrovia-") && key !== CACHE_NAME) {
            console.log("Clearing old service worker cache:", key);
            return caches.delete(key);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  // Never intercept development modules, even when an old registration is updating.
  if (LOCAL_DEVELOPMENT) return;
  const url = event.request.url;
  const parsed = new URL(url);
  if (!url.startsWith("http://") && !url.startsWith("https://")) return;
  if (event.request.method !== "GET" || event.request.headers.has("Authorization")) return;

  // Public media only. Never persist chat attachments, receipts, API responses,
  // or range-based video fragments. Public media URLs should change on upload.
  const isPublicMediaPath = !/(?:\/v1\/|\/api\/|chat|receipt|private|identity|avatar-upload)/i.test(parsed.pathname);
  const imageRequest = event.request.destination === "image";
  const videoRequest = event.request.destination === "video";
  if (isPublicMediaPath && (imageRequest || videoRequest)) {
    if (videoRequest && event.request.headers.has("Range")) return;
    const maxEntries = imageRequest ? MEDIA_MAX_IMAGES : MEDIA_MAX_VIDEOS;
    const maxAge = imageRequest ? MEDIA_MAX_AGE_MS : MEDIA_MAX_AGE_VIDEO_MS;
    const metaKey = new Request(`https://aura-cache-meta.invalid/${encodeURIComponent(url)}`);
    event.respondWith((async () => {
      const cache = await caches.open(imageRequest ? MEDIA_IMAGE_CACHE : MEDIA_VIDEO_CACHE);
      const meta = await caches.open(MEDIA_META_CACHE);
      const cached = await cache.match(event.request);
      if (cached) {
        const stamp = await meta.match(metaKey);
        const savedAt = stamp ? Number(await stamp.text()) : 0;
        if (savedAt && Date.now() - savedAt < maxAge) return cached;
        await cache.delete(event.request);
        await meta.delete(metaKey);
      }
      try {
        const response = await fetch(event.request);
        if (!response || (response.type !== "opaque" && !response.ok)) return response;
        if (videoRequest) {
          const length = Number(response.headers.get("content-length") || 0);
          if (response.status !== 200 || !length || length > MAX_CACHEABLE_VIDEO_BYTES) return response;
        }
        event.waitUntil((async () => {
          try {
            await cache.put(event.request, response.clone());
            await meta.put(metaKey, new Response(String(Date.now())));
            const keys = await cache.keys();
            if (keys.length > maxEntries) {
              const ranked = await Promise.all(keys.map(async (key) => {
                const keyMeta = new Request(`https://aura-cache-meta.invalid/${encodeURIComponent(key.url)}`);
                const value = await meta.match(keyMeta);
                return { key, keyMeta, time: value ? Number(await value.text()) : 0 };
              }));
              ranked.sort((a, b) => a.time - b.time);
              for (const old of ranked.slice(0, keys.length - maxEntries)) {
                await cache.delete(old.key);
                await meta.delete(old.keyMeta);
              }
            }
          } catch (_) { /* Storage may be full or unavailable; serve network. */ }
        })());
        return response;
      } catch (error) {
        if (cached) return cached;
        throw error;
      }
    })());
    return;
  }

  if (
    parsed.origin !== self.location.origin ||
    /^\/(?:@|src\/|node_modules\/|__vite)/.test(parsed.pathname) ||
    parsed.pathname.startsWith("/v1/") ||
    event.request.headers.has("Authorization")
  )
    return;

  // Bypass service worker for Firebase, Google APIs, Twilio, and API routes
  if (
    url.includes("firestore.googleapis.com") ||
    url.includes("firebase") ||
    url.includes("googleapis.com") ||
    url.includes("twilio.com") ||
    url.includes("/api/") ||
    event.request.method !== "GET"
  ) {
    return;
  }

  // Navigation requests: Network-first with SPA index.html fallback
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, copy).catch(() => {});
            });
            return response;
          }
          // If server returned 404 on dynamic SPA sub-path (e.g., /driver/..., /restaurant/...)
          return caches.match("/index.html").then((cachedIndex) => {
            return cachedIndex || response;
          });
        })
        .catch(async () => {
          const cachedIndex = await caches.match("/index.html");
          if (cachedIndex) return cachedIndex;
          const rootCached = await caches.match("/");
          if (rootCached) return rootCached;
          return new Response("Offline - please reconnect to internet", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          });
        }),
    );
    return;
  }

  // Cache only build assets and known public images; never arbitrary JS modules.
  if (!parsed.pathname.startsWith('/assets/') && !STATIC_ASSETS.includes(parsed.pathname)) return;
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkFetch = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, copy).catch(() => {});
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return cachedResponse || new Response("", { status: 408 });
        });

      return cachedResponse || networkFetch;
    }),
  );
});

// Handle clicking on mobile push / browser notifications
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes("/") && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow("/");
        }
      }),
  );
});
