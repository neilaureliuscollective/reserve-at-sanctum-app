import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, writeFile, access } from "node:fs/promises";
import assert from "node:assert/strict";
if (process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.RESERVE_BOOKING_EMAIL_ENABLED === "true") throw Error("Isolated local verification only");
for (const path of [".env", ".env.local", ".env.development", ".env.development.local"]) await access(path).then(() => { throw Error("No environment files permitted"); }, () => {});
const origin = "http://localhost:3000", home = "/fix-it-shop/app", app = "/fix-it-shop-app/index.html", gg = "https://fixitshop.glossgenius.com/", dir = "artifacts/public-first-entry";
await mkdir(dir, { recursive: true });
let browser, logs = "", ready = false;
const rows = [], checks = [], errors = [], writes = [], outbound = [];
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", process.argv.includes("--production") ? "start" : "dev", "--hostname", "127.0.0.1", "--port", "3000"], { env: { ...process.env, RESERVE_DEV_PREVIEW: "false", RESERVE_BOOKING_EMAIL_ENABLED: "false", RESERVE_BOOKING_CRON_ENABLED: "false", APP_ORIGIN: origin }, stdio: ["ignore", "pipe", "pipe"] });
server.stdout.on("data", d => { logs += d; if (String(d).includes("Ready in")) ready = true; }); server.stderr.on("data", d => logs += d);
async function context({ width = 390, height = 844, returning = false, standalone = false, reducedMotion = "reduce", mediaFailure = false, javaScriptEnabled = true } = {}) {
  const c = await browser.newContext({ viewport: { width, height }, reducedMotion, javaScriptEnabled, serviceWorkers: "block" });
  c.on("page", p => p.on("pageerror", e => errors.push(e.message)));
  c.on("request", r => { if (!["GET", "HEAD"].includes(r.method())) writes.push({ method: r.method(), url: r.url() }); });
  if (returning) await c.addInitScript(() => {
    if (location.origin !== "null" && !localStorage.getItem("fix-it-consultation:v1")) {
      localStorage.setItem("fix-it-consultation:v1", JSON.stringify({ version: 1, change: "Synthetic existing card", keep: "Existing texture", questions: "Existing question" }));
      localStorage.setItem("unrelated-synthetic-record", "preserved");
    }
  });
  if (standalone) await c.addInitScript(() => { const original = window.matchMedia.bind(window); window.matchMedia = q => q === "(display-mode: standalone)" ? { ...original(q), matches: true, addEventListener() {}, removeEventListener() {} } : original(q); });
  await c.route("**/*", r => {
    const u = new URL(r.request().url());
    if (u.origin === new URL(gg).origin) { outbound.push(r.request().url()); return r.fulfill({ contentType: "text/html", body: "<p>Captured booking handoff only.</p>" }); }
    if (u.origin !== origin) return r.abort();
    if (mediaFailure && /\.(webp|png|jpg|mp4)(\?|$)/.test(u.href)) return r.abort();
    return r.continue();
  });
  return c;
}
async function publicHome(p) { await p.waitForURL(origin + home); await p.locator("#fis-title:visible").waitFor(); }
async function bookingContrast(p) {
  return p.locator('.fix-it-nav:visible a.fix-it-book-action').evaluate(e => {
    const rgb = value => value.match(/[\d.]+/g).slice(0,3).map(Number);
    const luminance = values => values.map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum,v,i) => sum + v * [.2126,.7152,.0722][i],0);
    const text = luminance(rgb(getComputedStyle(e.querySelector('span')).color));
    return Math.min(...getComputedStyle(e).backgroundImage.match(/rgb\([^)]+\)/g).map(stop => { const background = luminance(rgb(stop)); return (Math.max(text,background) + .05) / (Math.min(text,background) + .05); }));
  });
}
async function guide(p) { await p.locator('.fix-it-nav:visible a[href="' + app + '#guide"]').click(); await p.waitForURL(origin + app + "#guide"); await p.locator('[data-screen="home"]:visible').waitFor(); }
try {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) { if (server.exitCode !== null) throw Error("Server stopped"); if (ready) break; await new Promise(r => setTimeout(r, 200)); }
  assert.ok(ready);
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  for (const width of [390, 884]) for (const returning of [false, true]) for (const standalone of [false, true]) {
    const c = await context({ width, returning, standalone }), p = await c.newPage();
    let navigations = 0; p.on("framenavigated", frame => { if (frame === p.mainFrame()) navigations++; });
    for (const requested of ["/", home, "/enter", home + "/launch", app, app + "#home"]) {
      navigations = 0; await p.goto(origin + requested); await publicHome(p);
      assert.ok(navigations <= 4, "Redirect loop " + requested);
      assert.deepEqual(await p.locator('.fix-it-nav:visible a').allTextContents().then(a => a.map(t => t.trim().replace("↗", "").trim())), ["Home", "Services", "Visit guide", "Book now"]);
      assert.equal(await p.locator('.fis-entrance__copy:visible a.button-gold').getAttribute("href"), gg);
      assert.ok(await bookingContrast(p) >= 4.5, "Book Now text contrast against each actual gradient stop");
      const snapshot = await p.evaluate(() => ({ saved: localStorage.getItem("fix-it-consultation:v1"), unrelated: localStorage.getItem("unrelated-synthetic-record") }));
      assert.equal(Boolean(snapshot.saved), returning);
      if (returning) assert.equal(snapshot.unrelated, "preserved");
      rows.push({ width, returning, standaloneEmulated: standalone, requested, finalPath: new URL(p.url()).pathname, navigations, savedCardPreserved: returning });
    }
    if (!returning && !standalone) { await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: `${dir}/public-home-${width}.png` }); }
    const m = await (await c.request.get(origin + "/fix-it-shop/booking.webmanifest")).json();
    assert.equal(m.start_url, app + "#home"); assert.equal(m.id, home); assert.equal(m.scope, "/");
    await p.goto(origin + m.start_url); await publicHome(p);
    await c.close();
  }
  checks.push("48 first/returning browser/standalone default-route cases reach one public Home without loops; installed start URL/IDs/scope remain unchanged");
  for (const width of [390, 884]) {
    const c = await context({ width, returning: true }), p = await c.newPage();
    await p.goto(origin + home); await publicHome(p);
    await p.locator('.fix-it-nav:visible a[href="' + home + '#services"]').click(); await p.waitForURL(origin + home + "#services"); await p.locator("#services").waitFor();
    await guide(p); await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: `${dir}/visit-guide-${width}.png` });
    await p.locator('.prepare-path').click(); await p.locator('[data-screen="card"]:visible').waitFor();
    await p.getByLabel("What would you like to keep?").fill("Synthetic unsaved edit stays through public Home.");
    const before = await p.evaluate(() => ({ saved: localStorage.getItem("fix-it-consultation:v1"), draft: sessionStorage.getItem("fix-it-consultation-draft:v1"), unrelated: localStorage.getItem("unrelated-synthetic-record") }));
    await p.goBack(); await p.waitForURL(origin + app + "#guide"); await p.goForward(); await p.waitForURL(origin + app + "#card");
    assert.equal(await p.getByLabel("What would you like to keep?").inputValue(), "Synthetic unsaved edit stays through public Home.");
    await p.locator('.app-nav a[href="' + home + '"]').click(); await publicHome(p);
    await p.goBack(); await p.waitForURL(origin + app + "#card"); await p.getByLabel("What would you like to keep?").waitFor();
    await p.reload(); await p.getByLabel("What would you like to keep?").waitFor();
    assert.equal(await p.getByLabel("What would you like to keep?").inputValue(), "Synthetic unsaved edit stays through public Home.");
    await p.evaluate(() => dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
    assert.equal(p.url(), origin + app + "#card");
    const after = await p.evaluate(() => ({ saved: localStorage.getItem("fix-it-consultation:v1"), draft: sessionStorage.getItem("fix-it-consultation-draft:v1"), unrelated: localStorage.getItem("unrelated-synthetic-record") }));
    assert.deepEqual(after, before);
    await p.screenshot({ path: `${dir}/card-draft-preserved-${width}.png` });
    for (const selector of ["#change", "#keep", "#questions", '#card-form button[type="submit"]', "#delete-card"]) {
      await p.locator(selector).focus();
      await p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const visible = await p.locator(selector).evaluate(e => { const r = e.getBoundingClientRect(), header = document.querySelector('.app-header').getBoundingClientRect(), nav = document.querySelector('.app-nav').getBoundingClientRect(); return r.top >= header.bottom && r.bottom <= (innerWidth < 800 ? nav.top : innerHeight); });
      assert.ok(visible, `Focused control obscured ${selector} ${width}`);
    }
    for (const hash of ["#show", "#visit", "#services", "#shop", "#katie", "#guide", "#card"]) {
      await p.goto(origin + app + hash); await p.waitForFunction(() => !!document.querySelector('[data-screen]:not([hidden])')); assert.equal(p.url(), origin + app + hash);
      await p.reload(); await p.waitForFunction(() => !!document.querySelector('[data-screen]:not([hidden])')); assert.equal(p.url(), origin + app + hash);
    }
    await p.locator('.app-nav a[href="' + home + '"]').click(); await publicHome(p);
    const book = p.locator('.fix-it-nav:visible a.fix-it-book-action'); await book.focus(); assert.ok(await bookingContrast(p) >= 4.5, "Focused Book Now contrast"); await p.keyboard.press("Enter"); await p.waitForURL(gg);
    await p.goBack(); await publicHome(p);
    assert.equal(await p.evaluate(() => localStorage.getItem("fix-it-consultation:v1")), before.saved);
    assert.equal(await p.evaluate(() => sessionStorage.getItem("fix-it-consultation-draft:v1")), before.draft);
    assert.equal(await p.evaluate(() => localStorage.getItem("unrelated-synthetic-record")), "preserved");
    await c.close();
  }
  checks.push("Phone/Fold Services→Visit guide→card, browser Back/Forward, public Home return, refresh, legacy deep links and emulated session resume retain saved card, unsaved draft and unrelated data; booking never infers completion");
  for (const [width, height] of [[320,600],[390,600],[884,600]]) {
    const c = await context({ width, height, mediaFailure: true }), p = await c.newPage(); await p.goto(origin + home); await publicHome(p);
    assert.ok(await p.locator("#fis-title").isVisible()); const book = p.locator('.fix-it-nav:visible a.fix-it-book-action');
    const r = await book.boundingBox(); assert.ok(r.width >= 44 && r.height >= 44 && r.y >= 0 && r.y + r.height <= height);
    await book.focus(); assert.equal(await book.evaluate(e => document.activeElement === e), true); await p.keyboard.press("Enter"); await p.waitForURL(gg); await p.goBack(); await publicHome(p);
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await p.screenshot({ path: `${dir}/media-failure-booking-${width}.png` }); await c.close();
  }
  checks.push("Readable public Home and 44px keyboard-accessible Book Now survive unavailable media at narrow/short/Fold sizes with reduced motion; no install or account gate");
  const nojs = await context({ javaScriptEnabled: false }), np = await nojs.newPage(); await np.goto(origin + home); const fallback = np.locator('.reserve-no-script a[href="' + gg + '"]').first(); await fallback.click(); await np.waitForURL(gg); await nojs.close();
  assert.deepEqual(errors, []); assert.deepEqual(writes, []); assert.ok(outbound.every(url => url === gg));
  console.log("PASS public-first entry: " + checks.join("; "));
} catch (error) { errors.push(String(error)); throw error; } finally { await writeFile(dir + "/results.json", JSON.stringify({ rows, checks, errors, writes, outbound, synthetic: true, physicalInstallation: false }, null, 2)); await browser?.close(); server.kill("SIGTERM"); await writeFile(dir + "/server.log", logs); }
