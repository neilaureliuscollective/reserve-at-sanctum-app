import { chromium } from "@playwright/test";
import sharp from "sharp";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { parseArgs } from "node:util";
import assert from "node:assert/strict";

const { values } = parseArgs({ options: { "baseline-public": { type: "string" }, "artifacts-dir": { type: "string", default: "artifacts/approved-identity" } } });
assert.ok(values["baseline-public"], "Supply the preserved 2f049d7 public tree, not a switched checkout");
const output = resolve(values["artifacts-dir"]), currentPublic = resolve("public"), baselinePublic = resolve(values["baseline-public"]);
await mkdir(output + "/before", { recursive: true }); await mkdir(output + "/after", { recursive: true });
let serving = baselinePublic, browser;
const results = [], errors = [];
const types = { ".html": "text/html", ".css": "text/css", ".mjs": "text/javascript", ".js": "text/javascript", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2", ".ico": "image/x-icon" };
const server = createServer(async (req, res) => {
  const file = resolve(serving, "." + new URL(req.url, "http://local").pathname);
  if (!file.startsWith(serving + sep)) { res.writeHead(403).end(); return; }
  try { const bytes = await readFile(file); res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" }).end(bytes); }
  catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = "http://127.0.0.1:" + server.address().port;
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
async function inspect(page) {
  return page.evaluate(() => {
    const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
    const geometry = [...document.querySelectorAll("h1,h2,p,a,button,label,textarea,.home-stage,.card-stage,.story-paths,.consultation-entry,.app-header,.app-nav,.expanded-booking,.founder-mark,.founder-mark>span")].filter(e => e.getClientRects().length && !e.closest(".crest-slot,.identity-pending,.identity-approved")).map(e => { const s = getComputedStyle(e); return { tag: e.tagName, id: e.id, text: e.matches('.home-stage,.card-stage,.founder-mark') ? '[container]' : e.textContent.trim().slice(0, 70), ...rect(e), font: s.font, padding: s.padding, radius: s.borderRadius, background: s.background.replaceAll(location.origin, "<origin>"), shadow: s.boxShadow }; });
    // Enlarged old placeholder paragraphs could paint beyond their fixed slot.
    // Their actual existing box is authorized replacement paint too; do not
    // hide an unrelated pixel delta behind a broader scene/panel mask.
    const identity = [...document.querySelectorAll(".crest-slot,.crest-slot p,.identity-pending,.identity-approved")].filter(e => e.getClientRects().length).map(rect);
    return { geometry, identity, overflow: document.documentElement.scrollWidth > innerWidth + 1, logoCount: document.querySelectorAll('img[data-approved-logo]').length };
  });
}
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  for (const [width, height, textScale] of [[320,900,100],[390,900,100],[540,900,100],[884,900,100],[1440,900,100],[884,600,100],[320,900,200],[884,600,200]]) {
    const snapshots = {};
    for (const phase of ["before", "after"]) {
      serving = phase === "before" ? baselinePublic : currentPublic;
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce", locale: "en-US", timezoneId: "UTC", serviceWorkers: "block" });
      await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
      const page = await context.newPage(); page.on("pageerror", error => errors.push(error.message)); await page.goto(origin + "/fix-it-shop-app/index.html#home"); await page.mouse.move(width - 2, 2);
      await page.evaluate(scale => document.documentElement.style.fontSize = scale + "%", textScale);
      for (const screen of ["home", "services", "card", "shop", "katie"]) {
        await page.evaluate(screen => location.hash = "#" + screen, screen); await page.waitForFunction(screen => !document.querySelector(`[data-screen="${screen}"]`).hidden, screen);
        await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].filter(img => img.getClientRects().length).map(img => img.decode())); scrollTo(0, 0); }); await settle(page);
        const name = `${screen}-${width}x${height}-text${textScale}`, data = await inspect(page);
        assert.equal(data.overflow, false, name);
        const image = await page.screenshot({ animations: "disabled", caret: "hide" });
        snapshots[phase + name] = { data, image };
        if ([390,884].includes(width) || textScale === 200) { await writeFile(`${output}/${phase}/${name}.png`, image); if (["home","card","katie"].includes(screen)) await page.screenshot({ path: `${output}/${phase}/${name}-full.png`, fullPage: true, animations: "disabled", caret: "hide" }); }
        if (phase === "after") {
          const before = snapshots["before" + name];
          assert.deepEqual(data.geometry, before.data.geometry, `Approved layout/material/type changed at ${name}`);
          assert.equal(data.logoCount, 3);
          const a = await sharp(image).ensureAlpha().raw().toBuffer(), b = await sharp(before.image).ensureAlpha().raw().toBuffer();
          const masks = [...data.identity, ...before.data.identity]; let outside = 0, changed = 0;
          for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
            const at = (y * width + x) * 4;
            if (!a.subarray(at, at + 4).equals(b.subarray(at, at + 4))) { changed++; if (!masks.some(r => x + .5 >= r.x && x + .5 < r.x + r.width && y + .5 >= r.y && y + .5 < r.y + r.height)) outside++; }
          }
          results.push({ name, geometryIdentical: true, identityMasks: masks, changed, outsideIdentitySlots: outside });
          assert.equal(outside, 0, `Pixels changed outside existing identity slots at ${name}`);
        }
      }
      await context.close();
    }
  }
  serving = currentPublic;
  const context = await browser.newContext({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1, serviceWorkers: "block" }), page = await context.newPage();
  await page.goto(origin + "/fix-it-shop-app/index.html");
  await page.setContent('<!doctype html><meta charset="utf-8"><style>body{font:16px system-ui;background:#f6f6f6;color:#16191c;padding:24px}section{display:flex;align-items:center;gap:28px;margin:22px 0}figure{margin:0;text-align:center}figcaption{margin-top:8px}.circle{border-radius:50%}.safe{border:1px dashed #444}</style><h1>Exact approved icon — native-size review</h1><section>' + [16,32,48,180,192].map(size => `<figure><img src="${origin}/fix-it-shop-app/identity/${size<180?'favicon':'icon'}-${size}.png" width="${size}" height="${size}"><figcaption>${size}px</figcaption></figure>`).join('') + '</section><h2>Maskable review — circle is a simulated OS crop only</h2><section><figure><img src="'+origin+'/fix-it-shop-app/identity/icon-512-maskable.png" width="256" height="256"><figcaption>Opaque padded export</figcaption></figure><figure><img class="circle" src="'+origin+'/fix-it-shop-app/identity/icon-512-maskable.png" width="256" height="256"><figcaption>Simulated circular mask</figcaption></figure></section>');
  await page.evaluate(() => Promise.all([...document.images].map(img => img.decode())));
  await page.screenshot({ path: output + "/icon-native-sizes-and-mask.png", fullPage: true }); await context.close();
  assert.deepEqual(errors, []);
  console.log(`PASS identity: ${results.length} viewport/state comparisons; identical approved layout/materials and zero changes outside reserved identity slots. Native icon-size and simulated mask review captured.`);
} catch (error) { errors.push(String(error)); throw error; }
finally { await writeFile(output + "/results.json", JSON.stringify({ results, errors, physicalInstall: false, externalRequests: "blocked" }, null, 2)); await browser?.close(); await new Promise(resolve => server.close(resolve)); }
