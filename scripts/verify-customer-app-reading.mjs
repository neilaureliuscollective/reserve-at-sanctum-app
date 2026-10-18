import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { parseArgs } from "node:util";
import assert from "node:assert/strict";

// Static public files and synthetic browser storage only. No Next server,
// database, Auth, merchant requests, or focus-driven scrolling in reading checks.
const { values } = parseArgs({ options: {
  "public-dir": { type: "string", default: "public" },
  "artifacts-dir": { type: "string", default: "artifacts/customer-app-reading" },
} });
const publicDir = resolve(values["public-dir"]);
const output = resolve(values["artifacts-dir"]);
const types = { ".html": "text/html", ".css": "text/css", ".mjs": "text/javascript", ".js": "text/javascript", ".webp": "image/webp", ".png": "image/png", ".woff2": "font/woff2" };
const server = createServer(async (req, res) => {
  const file = resolve(publicDir, "." + new URL(req.url, "http://localhost").pathname);
  if (!file.startsWith(publicDir + sep)) { res.writeHead(403).end(); return; }
  try { res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" }).end(await readFile(file)); }
  catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = "http://127.0.0.1:" + server.address().port;
let browser;
const cases = [], errors = [];
const settled = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
await mkdir(output, { recursive: true });
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  for (const [width, height, textScale] of [[390, 900, 100], [884, 900, 100], [884, 600, 100], [884, 900, 200], [884, 600, 200]]) {
    const name = `${width}x${height}-text${textScale}`;
    const context = await browser.newContext({ viewport: { width, height }, serviceWorkers: "block" });
    await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    const result = { name, width, height, textScale, reading: [], keyboard: [] };
    cases.push(result);
    await page.goto(origin + "/fix-it-shop-app/index.html#home");
    await page.evaluate(async scale => {
      document.documentElement.style.fontSize = scale + "%";
      await document.fonts.ready;
      await Promise.all([...document.querySelectorAll(".home-stage img")].map(img => img.decode()));
    }, textScale);
    await settled(page);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `${output}/home-${name}-initial.png` });
    const geometry = await page.evaluate(() => {
      const rect = selector => {
        const element = document.querySelector(selector), r = element.getBoundingClientRect();
        return { x: r.x, y: r.y + scrollY, width: r.width, height: r.height, bottom: r.bottom + scrollY, position: getComputedStyle(element).position };
      };
      return { stage: rect(".home-stage"), consultation: rect(".consultation-entry"), booking: rect(".expanded-booking"), share: rect(".share-row"), masthead: rect(".app-header"), maxScroll: Math.max(0, document.documentElement.scrollHeight - innerHeight) };
    });
    result.geometry = geometry;
    const readingScroll = Math.min(geometry.maxScroll, Math.max(0,
      geometry.share.y - geometry.masthead.height - (height - geometry.masthead.height - geometry.share.height) / 2));
    const stops = [...new Set([0, readingScroll, geometry.maxScroll, ...Array.from({ length: Math.ceil(geometry.maxScroll / 150) }, (_, index) => Math.min(geometry.maxScroll, index * 150))])];
    for (const top of stops) {
      await page.evaluate(top => scrollTo({ top, behavior: "instant" }), top);
      await settled(page);
      const reading = await page.evaluate(() => {
        const bar = document.querySelector(".expanded-booking"), br = bar.getBoundingClientRect();
        const visibleBar = br.width > 0 && br.height > 0 && br.bottom > 0 && br.top < innerHeight;
        const overlaps = [], walker = document.createTreeWalker(document.querySelector('[data-screen="home"]'), NodeFilter.SHOW_TEXT);
        let node;
        while (node = walker.nextNode()) {
          if (!node.textContent.trim() || !node.parentElement || bar.contains(node)) continue;
          const style = getComputedStyle(node.parentElement);
          if (style.display === "none" || style.visibility === "hidden") continue;
          const range = document.createRange(); range.selectNodeContents(node);
          for (const r of range.getClientRects()) {
            const left = Math.max(0, r.left, br.left), right = Math.min(innerWidth, r.right, br.right);
            const top = Math.max(0, r.top, br.top), bottom = Math.min(innerHeight, r.bottom, br.bottom);
            if (visibleBar && right - left > 1 && bottom - top > 1)
              overlaps.push({ text: node.textContent.trim(), x: left, y: top, width: right - left, height: bottom - top });
          }
        }
        return { scroll: scrollY, active: document.activeElement.tagName, overlaps };
      });
      result.reading.push(reading);
      // Save a failure image before asserting, including an ordinary-reading
      // view of the original defect. No focus/scrollIntoView can conceal it.
      if (reading.overlaps.length) await page.screenshot({ path: `${output}/home-${name}-overlap.png` });
      assert.deepEqual(reading.overlaps, [], `Booking strip overlaps ordinary reading at ${name}, scroll ${reading.scroll}`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `Horizontal overflow ${name}`);
    }
    await page.evaluate(top => scrollTo({ top, behavior: "instant" }), readingScroll);
    await settled(page);
    result.shareReading = await page.locator(".share-row").evaluate(element => {
      const rect = element.getBoundingClientRect(), header = document.querySelector(".app-header").getBoundingClientRect();
      const nav = document.querySelector(".app-nav").getBoundingClientRect();
      const bottom = nav.width > nav.height ? nav.top : innerHeight;
      const unobscured = [...element.querySelectorAll("h2,p,button")].every(child => {
        const r = child.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return hit && (hit === child || child.contains(hit));
      });
      return { top: rect.top, bottom: rect.bottom, readingTop: header.bottom, readingBottom: bottom, unobscured, focused: element.contains(document.activeElement) };
    });
    assert.ok(result.shareReading.top >= result.shareReading.readingTop && result.shareReading.bottom <= result.shareReading.readingBottom && result.shareReading.unobscured, `Share must be fully readable without focus at ${name}`);
    assert.equal(result.shareReading.focused, false);
    await page.screenshot({ path: `${output}/home-${name}-reading.png` });
    await page.screenshot({ path: `${output}/home-${name}-full.png`, fullPage: true });
    // Independent keyboard coverage follows the reading captures, never repairs
    // their geometry. Check the actual rendered hit target after each focus step.
    await page.locator(".skip").focus();
    for (let index = 0; index < 18; index++) {
      await page.keyboard.press("Tab"); await settled(page);
      const target = await page.evaluate(() => {
        const element = document.activeElement;
        if (!element || element === document.body) return null;
        const r = element.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2;
        const hit = document.elementFromPoint(x, y);
        return { text: element.textContent.trim().slice(0, 60), unobscured: x >= 0 && x < innerWidth && y >= 0 && y < innerHeight && !!hit && (hit === element || element.contains(hit)) };
      });
      if (target) { result.keyboard.push(target); assert.equal(target.unobscured, true, `Obscured keyboard target ${name}: ${target.text}`); }
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(`PASS ordinary Home reading: ${cases.length} viewport/text cases; ${cases.reduce((sum, item) => sum + item.reading.length, 0)} scroll samples; ${cases.reduce((sum, item) => sum + item.keyboard.length, 0)} keyboard targets. No booking/text intersections; Share readable before focus.`);
} catch (error) {
  errors.push(String(error)); throw error;
} finally {
  await writeFile(output + "/results.json", JSON.stringify({ cases, errors, synthetic: true, physicalFold: false, externalRequests: "blocked" }, null, 2));
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
