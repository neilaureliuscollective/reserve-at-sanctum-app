import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import assert from "node:assert/strict";
import { DateTime } from "luxon";

if (existsSync(".env.local")) loadEnvFile(".env.local");
if (
  process.env.DATABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NODE_ENV === "production"
)
  throw new Error(
    "Browser verification requires the isolated local synthetic preview.",
  );

// Starts its own server so browser and app also work in isolated CI networks.
await mkdir("artifacts", { recursive: true });
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1"],
  {
    env: {
      ...process.env,
      RESERVE_DEV_PREVIEW: "true",
      APP_ORIGIN: "http://localhost:3000",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let browser;
try {
  await new Promise((resolve, reject) => {
    server.stdout.on("data", (d) => {
      if (d.toString().includes("Ready in")) resolve();
    });
    server.stderr.on("data", (d) => process.stderr.write(d));
    server.on("exit", (code) =>
      reject(new Error(`Preview server exited: ${code}`)),
    );
    setTimeout(
      () => reject(new Error("Preview server startup timed out")),
      30000,
    ).unref();
  });
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const visit = async (path) => {
    await page.goto(`http://localhost:3000${path}`);
    await page.waitForLoadState("networkidle");
  };
  await visit("/");
  assert.match(await page.title(), /The Reserve at Sanctum/);
  await page.locator("canvas").waitFor();
  await page.screenshot({ path: "artifacts/home-desktop.png", fullPage: true });
  await page
    .locator(".arrival")
    .screenshot({ path: "artifacts/hero-desktop.png" });
  await page.getByRole("button", { name: "Pause scene motion" }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "Play scene motion" })
      .getAttribute("aria-pressed"),
    "true",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => {
    const c = document.querySelector(".seal-canvas canvas");
    const box = document.querySelector(".seal-canvas");
    return (
      c && box && Math.abs(parseFloat(c.style.width) - box.clientWidth) < 2
    );
  });
  await page.screenshot({ path: "artifacts/home-mobile.png", fullPage: true });
  await page
    .locator(".arrival")
    .screenshot({ path: "artifacts/hero-mobile.png" });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.getByRole("button", { name: "Open menu" }).click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Fix It Shop", exact: true })
    .click();
  await page.waitForURL("**/fix-it-shop");
  await page.waitForLoadState("networkidle");
  await page.screenshot({
    path: "artifacts/fix-it-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await visit("/aurelius");
  await page.screenshot({
    path: "artifacts/aurelius-desktop.png",
    fullPage: true,
  });
  // Public website review: narrow cover screen, phone, unfolded, laptop, desktop.
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    for (const route of ["/", "/fix-it-shop", "/aurelius", "/visit"]) {
      await visit(route);
      assert.equal(await page.locator("main h1").count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${route} overflows at ${width}`);
      if ([390, 1440].includes(width)) {
        for (const img of await page.locator("main img").all()) await img.scrollIntoViewIfNeeded();
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: `artifacts/visual-${route === "/" ? "home" : route.slice(1)}-${width}.png`, fullPage: true });
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await visit("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Your visits" }).focus();
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("button", { name: "Open menu" }).evaluate(el => el === document.activeElement), true);
  await page.getByRole("link", { name: "Explore Fix It Shop" }).click();
  await page.waitForURL("**/fix-it-shop");
  await page.getByRole("navigation", { name: "Continue exploring" }).getByRole("link").click();
  await page.waitForURL("**/aurelius");
  await page.getByRole("navigation", { name: "Continue exploring" }).getByRole("link").click();
  await page.waitForURL("http://localhost:3000/");
  const noScript = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const staticPage = await noScript.newPage();
  await staticPage.goto("http://localhost:3000/");
  assert.ok(await staticPage.getByRole("heading", { name: "A higher you belongs here." }).isVisible());
  assert.equal(await staticPage.locator(".world-card").count(), 2);
  await noScript.close();
  await visit("/book");
  await page.getByRole("button", { name: /Signature grooming/ }).click();
  await page.getByRole("button", { name: "Find a time" }).click();
  let day = DateTime.now().setZone("America/Chicago").plus({ days: 4 });
  while (![2, 3, 4, 5, 6].includes(day.weekday)) day = day.plus({ days: 1 });
  await page.locator("input[type=date]").fill(day.toISODate());
  await page.locator(".time-grid button").first().click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("link", { name: "Continue to sign in" }).click();
  await page.getByRole("button", { name: /Experience a client visit/ }).click();
  await page.waitForURL("**/book?**");
  await page
    .locator("#visit-note")
    .fill("Browser verification: a natural finish.");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "artifacts/booking-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Reserve preview visit" }).click();
  await page.getByText("PREVIEW VISIT RESERVED", { exact: true }).waitFor();
  await page.getByRole("link", { name: "View your visits" }).click();
  await page.locator(".appointment").first().waitFor();
  const res = await context.request.get(
    "http://localhost:3000/api/appointments",
  );
  const created = (await res.json()).visits.find(
    (a) =>
      a.note === "Browser verification: a natural finish." &&
      a.status === "confirmed",
  );
  assert.ok(created);
  await page.reload();
  await page
    .locator(".appointment")
    .filter({ hasText: created.id.slice(0, 8).toUpperCase() })
    .waitFor();
  await page.screenshot({
    path: "artifacts/account-mobile.png",
    fullPage: true,
  });
  const forbidden = await context.request.get(
    "http://localhost:3000/api/appointments?studio=true",
  );
  assert.equal(forbidden.status(), 403);
  const badOrigin = await context.request.patch(
    `http://localhost:3000/api/appointments/${created.id}`,
    {
      headers: { Origin: "https://untrusted.invalid" },
      data: { action: "cancel", revision: 1 },
    },
  );
  assert.equal(badOrigin.status(), 403);
  await visit("/signin?next=/studio");
  await page.getByRole("button", { name: /Open Katie’s studio/ }).click();
  await page.waitForURL("**/studio");
  const record = page
    .locator(".appointment")
    .filter({ hasText: created.id.slice(0, 8).toUpperCase() });
  await record.waitFor();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "artifacts/studio-desktop.png",
    fullPage: true,
  });
  await record.getByRole("button", { name: "Reschedule", exact: true }).click();
  let next = day.plus({ days: 1 });
  while (![2, 3, 4, 5, 6].includes(next.weekday)) next = next.plus({ days: 1 });
  await record.locator("input[type=date]").fill(next.toISODate());
  await record.locator(".time-grid button").first().click();
  await record.getByRole("button", { name: "Confirm new time" }).click();
  await page.getByRole("status").filter({ hasText: "rescheduled" }).waitFor();
  await record
    .getByRole("button", { name: "Cancel visit", exact: true })
    .click();
  await record.getByRole("button", { name: "Confirm cancellation" }).click();
  await page.getByRole("status").filter({ hasText: "cancelled" }).waitFor();
  const studioResponse = await context.request.get(
    "http://localhost:3000/api/appointments?studio=true",
  );
  const final = (await studioResponse.json()).visits.find(
    (a) => a.id === created.id,
  );
  assert.equal(final.status, "cancelled");
  assert.equal(final.revision, 3);
  assert.equal(final.price, created.price);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await visit("/");
  assert.ok(await page.locator(".arrival.motion-paused").count());
  assert.deepEqual(errors, []);
  console.log(
    "PASS: desktop/mobile design, live WebGL, pause/reduced motion, mobile navigation, full booking/sign-in return, persisted client and Katie views, reschedule/cancel, studio permission, and cross-origin rejection.",
  );
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
