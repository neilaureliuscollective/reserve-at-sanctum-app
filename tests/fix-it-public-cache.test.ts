import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
const origin = "https://local.preview.invalid";
async function worker() {
  const listeners = new Map<string, (event: any) => void>();
  const saved = new Map<string, Response>(), requested: Request[] = [], deleted: string[] = [];
  const cache = {
    match: async (path: string) => saved.get(path),
    put: async (path: string, response: Response) => { saved.set(path, response); },
    addAll: async (requests: Request[]) => { requests.forEach(r => { requested.push(r); saved.set(new URL(r.url).pathname, new Response("public fixture")); }); },
  };
  const localRequest = class extends Request { constructor(path: string, options?: RequestInit) { super(new URL(path, origin), options); } };
  runInNewContext(await readFile("public/fix-it-shop-app/sw.js", "utf8"), {
    self: { location: { origin }, clients: { claim: async () => {} }, skipWaiting: async () => {}, addEventListener: (name: string, fn: (e: any) => void) => listeners.set(name, fn) },
    caches: { open: async () => cache, keys: async () => ["fix-it-pocket-public-v14", "fix-it-pocket-public-v15", "unrelated-site-cache"], delete: async (name: string) => { deleted.push(name); return true; } }, URL, Request: localRequest,
    fetch: async (r: Request) => { requested.push(r); return new Response("public material"); },
  });
  async function event(name: string, values: any = {}) {
    const promises: Promise<unknown>[] = [];
    listeners.get(name)!({ ...values, waitUntil: (p: Promise<unknown>) => promises.push(p) });
    await Promise.all(promises);
  }
  return { event, saved, requested, listeners, deleted };
}
test("activation retires the prior app cache while preserving the current version and unrelated caches", async () => {
  const w = await worker(); await w.event("activate");
  assert.deepEqual(w.deleted, ["fix-it-pocket-public-v14"]);
});
test("public worker installs core only, without downloading both responsive material masters or old logos", async () => {
  const w = await worker(); await w.event("install");
  assert.equal(w.saved.size, 11);
  assert.ok([...w.saved.keys()].every(path => path.startsWith("/fix-it-shop-app/")));
  assert.ok(![...w.saved.keys()].some(path => /stage-(phone|wide)|images\/approved|icons/.test(path)));
  assert.ok(w.requested.every(r => r.credentials === "omit"));
});
test("only a selected public material is warmed, acknowledged after storage, and deduplicated", async () => {
  const w = await worker(), replies: any[] = [];
  const data = { type: "CACHE_PUBLIC_STAGE", path: "/fix-it-shop-app/materials/stage-phone.webp" };
  const request = { data, source: { url: origin + "/fix-it-shop-app/index.html#home" }, ports: [{ postMessage: (v: unknown) => replies.push(v) }] };
  await w.event("message", request); await w.event("message", request);
  assert.equal(w.requested.length, 1); assert.equal(w.requested[0].credentials, "omit");
  assert.equal(w.saved.size, 1); assert.equal(w.saved.has("/fix-it-shop-app/materials/stage-wide.webp"), false);
  assert.ok(replies.every(r => r.cached === true && r.path === data.path));
});
test("forged private paths, origins, sources and fetches cannot enter the public cache", async () => {
  const w = await worker();
  for (const path of ["/api/auth", "/account", "/chair", "/fix-it-shop-app/../api/private", "https://evil.invalid/private", "/fix-it-shop-app/materials/stage-phone.webp?private=1"])
    await w.event("message", { data: { type: "CACHE_PUBLIC_STAGE", path }, source: { url: origin + "/fix-it-shop-app/index.html" }, ports: [] });
  for (const url of [origin + "/account", "https://evil.invalid/fix-it-shop-app/index.html"])
    await w.event("message", { data: { type: "CACHE_PUBLIC_STAGE", path: "/fix-it-shop-app/materials/stage-phone.webp" }, source: { url }, ports: [] });
  for (const url of [origin + "/api/auth", origin + "/chair", origin + "/fix-it-shop-app/materials/stage-phone.webp?private=1", "https://evil.invalid/fix-it-shop-app/app.css"])
    w.listeners.get("fetch")!({ request: new Request(url), respondWith: () => assert.fail("Private/unlisted request intercepted") });
  assert.equal(w.saved.size, 0); assert.equal(w.requested.length, 0);
});
