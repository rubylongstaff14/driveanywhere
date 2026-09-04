const STATIC_CACHE = "driveanywhere-static-v1";
const DATA_CACHE = "driveanywhere-route-data-v1";
const ROUTE_FILES = ["alps-mountain-pass","canary-wharf-loop","dubai-marina-circuit","egypt-pyramids","embankment-run","new-york-harbor-circuit","rio-coast-circuit","tokyo-drift-circuit","westminster-sprint"].map((slug) => `/routes/${slug}.json`);
self.addEventListener("install", (event) => { event.waitUntil(caches.open(DATA_CACHE).then((cache) => cache.addAll(ROUTE_FILES))); self.skipWaiting(); });
self.addEventListener("activate", (event) => { event.waitUntil(self.clients.claim()); });
self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_RACE_ASSETS") return;
  const urls = Array.isArray(event.data.urls) ? event.data.urls : [];
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => Promise.all(urls.map((url) => cache.add(url).catch(() => undefined)))));
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const isRouteData = url.pathname.startsWith("/routes/") && url.pathname.endsWith(".json");
  const isStaticAsset = url.pathname.startsWith("/_next/static/") || /\.(png|jpe?g|webp|avif|glb|gltf|ktx2|woff2?)$/i.test(url.pathname);
  if (!isRouteData && !isStaticAsset) return;
  const cacheName = isRouteData ? DATA_CACHE : STATIC_CACHE;
  event.respondWith(caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request).then((response) => { if (response.ok) caches.open(cacheName).then((cache) => cache.put(request, response.clone())); return response; });
  }));
});
