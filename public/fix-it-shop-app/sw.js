// Public app files only. Never cache Next pages, auth, APIs, private records,
// provider pages or external sites. Optional stage art is selected by <picture>.
const CACHE = "fix-it-pocket-public-v16";
const APP = "/fix-it-shop-app/index.html";
const CORE_ASSETS = [APP, "/fix-it-shop-app/app.css", "/fix-it-shop-app/concept.css", "/fix-it-shop-app/app.mjs", "/fix-it-shop-app/state.mjs", "/fix-it-shop-app/presentation.mjs", "/fix-it-shop-app/fonts/display-regular.woff2", "/fix-it-shop-app/fonts/display-italic.woff2", "/fix-it-shop-app/fonts/sans-regular.woff2", "/fix-it-shop-app/fonts/sans-semibold.woff2", "/fix-it-shop-app/materials/home-grain.png"];
const STAGE_ASSETS = ["/fix-it-shop-app/materials/stage-phone.webp", "/fix-it-shop-app/materials/stage-wide.webp"];
const PUBLIC_ASSETS = [...CORE_ASSETS, ...STAGE_ASSETS];
async function publicStage(path) {
  const cache = await caches.open(CACHE);
  const existing = await cache.match(path);
  if (existing) return true;
  const response = await fetch(new Request(path, { credentials: "omit", cache: "default" }));
  if (!response.ok || response.type === "opaque") return false;
  await cache.put(path, response);
  return true;
}
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE_ASSETS.map(url => new Request(url, { credentials: "omit", cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("fix-it-pocket-public-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("message", event => {
  const { type, path } = event.data || {};
  const source = event.source?.url ? new URL(event.source.url) : null;
  if (type !== "CACHE_PUBLIC_STAGE" || !STAGE_ASSETS.includes(path) || !source || source.origin !== self.location.origin || !source.pathname.startsWith("/fix-it-shop-app/")) return;
  event.waitUntil(publicStage(path).catch(() => false).then(cached => event.ports[0]?.postMessage({ path, cached })));
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.search || !PUBLIC_ASSETS.includes(url.pathname)) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const existing = await cache.match(url.pathname);
    if (existing) return existing;
    const response = await fetch(new Request(url.href, { credentials: "omit" }));
    if (STAGE_ASSETS.includes(url.pathname) && response.ok && response.type !== "opaque") await cache.put(url.pathname, response.clone());
    return response;
  }));
});
