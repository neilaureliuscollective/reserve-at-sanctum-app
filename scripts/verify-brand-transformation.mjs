import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
if (process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NODE_ENV === "production") throw Error("Isolated synthetic preview only.");
const origin = "http://localhost:3000";
const folder = "artifacts/brand-transformation";
await mkdir(folder, { recursive: true });
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3000"], {
  env: { ...process.env, RESERVE_DEV_PREVIEW: "true", APP_ORIGIN: origin }, stdio: ["ignore", "pipe", "pipe"],
});
let logs = "", browser;
server.stdout.on("data", d => logs += d);
server.stderr.on("data", d => logs += d);
const results = [], audits = [];
try {
  await new Promise((resolve, reject) => {
    server.stdout.on("data", d => { if (String(d).includes("Ready in")) resolve(); });
    server.on("exit", c => reject(Error("Server exit " + c)));
    setTimeout(() => reject(Error("Startup timeout")), 30000).unref();
  });
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || chromium.executablePath(), args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const page = await context.newPage(), errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.setDefaultTimeout(20000);
  const visit = async path => { const response = await page.goto(origin + path); await page.waitForLoadState("networkidle"); assert.ok(response.ok(), path + " HTTP " + response.status()); };
  const login = async identity => assert.equal((await context.request.post(origin + "/api/auth", { headers: { Origin: origin }, data: identity ? { action: "preview", identity } : { action: "signout" } })).status(), 200);
  await login(null);
  await visit("/");
  assert.equal(new URL(page.url()).pathname, "/fix-it-shop/app");
  for (const [identity, expected] of [[null, "/fix-it-shop/app"], ["preview-client", "/fix-it-shop/app"], ["preview-katie", "/studio/today"], ["preview-neil", "/studio"]]) {
    await login(identity);
    for (const route of ["/enter", "/fix-it-shop/app/launch"]) {
      await visit(route); assert.equal(new URL(page.url()).pathname, expected); results.push({ identity, route, expected });
    }
  }
  const surfaces = [
    [null, "/fix-it-shop/app", "home"], [null, "/fix-it-shop", "katie"], [null, "/fix-it-shop/app/book", "services"],
    [null, "/fix-it-shop/app/install", "install"], [null, "/signin?next=%2Fstudio", "signin"],
    ["preview-client", "/account", "account"], ["preview-client", "/chair", "chair"],
    ["preview-client", "/visit", "professionals"], ["preview-client", "/my-visit", "visit"],
    ["preview-katie", "/studio/today", "dashboard"], ["preview-katie", "/studio/schedule", "schedule"],
    ["preview-katie", "/studio/operations", "operations"], ["preview-neil", "/studio", "command"],
    [null, "/privacy", "privacy"], [null, "/booking-technology", "technology"],
  ];
  for (const [identity, route, name] of surfaces) {
    await login(identity);
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
      await visit(route);
      assert.ok(await page.locator("main").count() >= 1, route + " main");
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${route} overflow ${width}`);
      const body = await page.locator("body").innerText();
      assert.doesNotMatch(body, /POWERED BY LEGACY RESERVE|WITHIN SANCTUM|BACK TO SANCTUM|LEGACY RESERVE SANCTUM/i, route);
      if (width !== 320) await page.screenshot({ path: `${folder}/${name}-${width}.png`, fullPage: false });
      if (width === 390 && process.env.AXE_PATH) {
        await page.addScriptTag({ path: process.env.AXE_PATH });
        const audit = await page.evaluate(async () => {
          const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } });
          return { violations: r.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), passes: r.passes.length };
        });
        audits.push({ route, ...audit });
      }
    }
  }
  await login("preview-client");
  assert.equal((await context.request.get(origin + "/api/studio/day?provider=katie")).status(), 403);
  await visit("/book?provider=katie&service=signature&location=eunice");
  assert.equal(new URL(page.url()).searchParams.get("service"), "signature");
  for (const route of ["/shop", "/shop/cart", "/discover", "/home"]) await visit(route);
  assert.deepEqual(errors, []);
  await writeFile(`${folder}/results.json`, JSON.stringify({ source: "Synthetic local PGlite and preview sessions in isolated sandbox", results, audits, browserErrors: errors }, null, 2));
  assert.equal(audits.flatMap(a => a.violations).length, 0, "Accessibility violations; see results.json");
  console.log(`PASS brand transformation: role-aware launch, 15 surfaces at 320/390/1440px, retained historical routes, authorization denial and ${audits.length} accessibility audits.`);
} finally {
  await writeFile(`${folder}/server.log`, logs);
  await browser?.close(); server.kill("SIGTERM");
}
