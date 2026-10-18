import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

async function entry(hash: string, online: boolean, reachable = true, deferProbe = false) {
  let completeProbe: (value: { ok: boolean }) => void = () => {};
  const navigations: string[] = [], listeners = new Map<string, () => void>();
  const location = { hash, replace: (path: string) => navigations.push(path) };
  const window: any = { addEventListener: (name: string, fn: () => void) => listeners.set(name, fn), dispatchEvent: (event: Event) => listeners.get(event.type)?.() };
  const navigator = { onLine: online };
  runInNewContext(await readFile("public/fix-it-shop-app/public-entry.js", "utf8"), { window, location, navigator, AbortController, setTimeout, clearTimeout, Event, fetch: async () => { if (deferProbe) return new Promise<{ ok: boolean }>(resolve => { completeProbe = resolve; }); if (!reachable) throw Error("Network unavailable"); return { ok: true }; } });
  await new Promise(resolve => setImmediate(resolve));
  return { navigations, listeners, location, navigator, window, finishProbe: () => completeProbe({ ok: true }) };
}
test("old online default install links open the one existing public Home", async () => {
  for (const hash of ["", "#home"]) assert.deepEqual((await entry(hash, true)).navigations, ["/fix-it-shop/app"]);
});
test("meaningful task and legacy deep links stay in place, with no saved-state routing", async () => {
  for (const hash of ["#guide", "#card", "#show", "#visit", "#services", "#shop", "#katie", "#unknown"])
    assert.deepEqual((await entry(hash, true)).navigations, [], hash);
});
test("a connected device without public Home connectivity keeps the cached guide", async () => {
  const e = await entry("#home", true, false);
  assert.deepEqual(e.navigations, []); assert.equal(e.window.fixItPublicHomeUnavailable, true);
  assert.equal(e.window.openFixItPublicHome(), false);
});
test("a late public-page response cannot interrupt a card task opened during the probe", async () => {
  const e = await entry("#home", true, true, true);
  e.location.hash = "#card"; e.finishProbe();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(e.navigations, []); assert.equal(e.location.hash, "#card");
});
test("offline default launches preserve cached guide access; reconnect and session resume never reset a task", async () => {
  const e = await entry("#home", false);
  assert.deepEqual(e.navigations, []);
  assert.equal(e.listeners.has("pageshow"), false); assert.equal(e.listeners.has("online"), false);
  e.location.hash = "#card"; e.navigator.onLine = true;
  assert.equal(e.window.openFixItPublicHome(), false); assert.deepEqual(e.navigations, []);
  e.location.hash = "#home"; e.listeners.get("hashchange")!();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(e.navigations, ["/fix-it-shop/app"]);
});
