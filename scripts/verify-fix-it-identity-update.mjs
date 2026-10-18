import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { parseArgs } from "node:util";
import assert from "node:assert/strict";
const { values } = parseArgs({ options: { "baseline-public": { type: "string" }, "artifacts-dir": { type: "string", default: "artifacts/identity-update" } } });
assert.ok(values["baseline-public"]);
const output = resolve(values["artifacts-dir"]); await mkdir(output, { recursive: true });
let serving = resolve(values["baseline-public"]), browser;
const types = { ".html": "text/html", ".css": "text/css", ".mjs": "text/javascript", ".js": "text/javascript", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2", ".ico": "image/x-icon" };
const server = createServer(async (req, res) => {
  const file = resolve(serving, "." + new URL(req.url, "http://local").pathname);
  if (!file.startsWith(serving + sep)) { res.writeHead(403).end(); return; }
  try { const bytes = await readFile(file); res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" }).end(bytes); }
  catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = "http://127.0.0.1:" + server.address().port;
const result = { synthetic: true, physicalInstall: false, checks: [], errors: [] };
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
  await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage(); page.on("pageerror", error => result.errors.push(error.message));
  await page.goto(origin + "/fix-it-shop-app/index.html#card");
  await page.waitForFunction(async () => !!navigator.serviceWorker.controller && (await caches.keys()).includes("fix-it-pocket-public-v16"));
  await page.getByLabel("What would you like to change?").fill("Synthetic saved visit survives identity update.");
  await page.getByRole("button", { name: "Save on this device" }).click();
  const saved = await page.evaluate(() => { localStorage.setItem("unrelated-synthetic-record", "preserved"); return localStorage.getItem("fix-it-consultation:v1"); });
  assert.ok(saved);
  serving = resolve("public");
  await page.evaluate(async () => {
    const previous = navigator.serviceWorker.controller;
    const controlled = new Promise(resolve => navigator.serviceWorker.addEventListener("controllerchange", function changed() {
      if (navigator.serviceWorker.controller !== previous) { navigator.serviceWorker.removeEventListener("controllerchange", changed); resolve(); }
    }));
    await (await navigator.serviceWorker.getRegistration()).update();
    await controlled;
  });
  await page.waitForFunction(async () => { const keys = await caches.keys(); return keys.includes("fix-it-pocket-public-v17") && !keys.includes("fix-it-pocket-public-v16"); });
  assert.equal(await page.evaluate(async () => (await (await (await caches.open("fix-it-pocket-public-v17")).match("/fix-it-shop-app/index.html")).text()).includes("data-approved-logo")), true, "Updated cache must contain the new identity document");
  await page.reload();
  await page.getByLabel("What would you like to change?").waitFor();
  assert.equal(await page.getByLabel("What would you like to change?").inputValue(), "Synthetic saved visit survives identity update.");
  assert.equal(await page.evaluate(() => localStorage.getItem("fix-it-consultation:v1")), saved);
  assert.equal(await page.evaluate(() => localStorage.getItem("unrelated-synthetic-record")), "preserved");
  assert.equal(await page.locator("img[data-approved-logo]").count(), 3);
  await page.screenshot({ path: output + "/update-card-preserved.png", fullPage: true });
  result.checks.push("Same browser/origin updated actual v16 worker to v17; online reload kept saved card and unrelated local record byte-for-byte");
  result.cached = await page.evaluate(async () => (await (await caches.open("fix-it-pocket-public-v17")).keys()).map(request => new URL(request.url).pathname));
  assert.ok(result.cached.includes("/fix-it-shop-app/identity/full-logo-280.webp"));
  assert.ok(result.cached.every(path => path.startsWith("/fix-it-shop-app/") && !path.includes("/api/")));
  await context.setOffline(true);
  await page.reload(); await page.getByLabel("What would you like to change?").waitFor();
  assert.equal(await page.getByLabel("What would you like to change?").inputValue(), "Synthetic saved visit survives identity update.");
  await page.locator('.app-nav a[href="#home"]').click();
  await page.waitForFunction(() => { const image = document.querySelector('.home-stage img[data-approved-logo]'); return image?.complete && image.naturalWidth === 280; });
  await page.screenshot({ path: output + "/update-home-approved-logo-offline.png", fullPage: true });
  result.checks.push("Fresh offline reopening kept saved visit; actual approved logo decoded from the new public cache; no private/API path cached");
  assert.deepEqual(result.errors, []);
  console.log("PASS identity update: " + result.checks.join("; "));
} catch (error) { result.errors.push(String(error)); throw error; }
finally { await writeFile(output + "/results.json", JSON.stringify(result, null, 2)); await browser?.close(); await new Promise(resolve => server.close(resolve)); }
