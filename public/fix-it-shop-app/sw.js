// Scope is this static public app only. Never cache Next pages, auth, APIs,
// appointments, Chair records or any response containing account information.
const CACHE = "fix-it-pocket-public-v7";
const APP = "/fix-it-shop-app/index.html";
const PUBLIC_ASSETS = [APP, "/fix-it-shop-app/app.css", "/fix-it-shop-app/app.mjs", "/fix-it-shop-app/state.mjs", "/images/approved/fix-it-shop.webp", "/fix-it-shop/app/icons/192.png"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PUBLIC_ASSETS.map(url => new Request(url, { credentials: "omit", cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("fix-it-pocket-public-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.search || !PUBLIC_ASSETS.includes(url.pathname)) return;
  event.respondWith(caches.open(CACHE).then(cache => cache.match(url.pathname).then(cached => cached || fetch(new Request(url.href, { credentials: "omit" })))));
});
