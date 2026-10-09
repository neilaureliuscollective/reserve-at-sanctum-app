import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3117",
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);
let log = "",
  browser;
server.stdout.on("data", (d) => (log += d));
server.stderr.on("data", (d) => (log += d));
const base = "http://127.0.0.1:3117/discover";
try {
  await new Promise((resolve, reject) => {
    server.stdout.on("data", (d) => {
      if (String(d).includes("Ready in")) resolve();
    });
    server.on("exit", () => reject(Error(log)));
    setTimeout(() => reject(Error(log)), 30000).unref();
  });
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await mkdir("docs/verification", { recursive: true });
  for (const width of [
    320, 390, 430, 700, 768, 884, 1024, 1151, 1280, 1440, 1920,
  ]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(base);
    await page.locator(".living-crest").scrollIntoViewIfNeeded();
    await page.locator('.living-crest[data-crest-state="active"]').waitFor();
    assert.equal(await page.locator(".living-crest canvas").count(), 1);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `overflow ${width}`,
    );
    const button = page.getByRole("button", {
      name: "Pause crest and environment motion",
    });
    await button.click();
    await page.locator('.living-crest[data-crest-state="paused"]').waitFor();
    const frames = await page
      .locator(".living-crest canvas")
      .getAttribute("data-render-count");
    await page.waitForTimeout(250);
    assert.equal(
      await page
        .locator(".living-crest canvas")
        .getAttribute("data-render-count"),
      frames,
      "pause stops rendering",
    );
    await page.locator(".experience-menu summary").click();
    await page.waitForFunction(
      () =>
        document
          .querySelector(".experience-motion")
          ?.getAttribute("aria-label") === "Enable environment motion",
      {},
      { timeout: 3000 },
    );
    await page.locator(".experience-menu summary").click();
    await page
      .getByRole("button", { name: "Enable crest and environment motion" })
      .click();
    await page.locator('.living-crest[data-crest-state="active"]').waitFor();
    if (width === 1440 || width === 390) {
      await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      await page.waitForTimeout(700);
      await page.screenshot({
        path: `docs/verification/living-crest-${width}.png`,
        fullPage: width === 390,
      });
    }
    await page.evaluate(() =>
      scrollTo({ top: document.body.scrollHeight, behavior: "instant" }),
    );
    await page.locator('.living-crest[data-crest-state="paused"]').waitFor();
    const offscreen = await page
      .locator(".living-crest canvas")
      .getAttribute("data-render-count");
    await page.waitForTimeout(250);
    assert.equal(
      await page
        .locator(".living-crest canvas")
        .getAttribute("data-render-count"),
      offscreen,
      "offscreen stops rendering",
    );
    console.log(
      `PASS viewport ${width}: layout, pause, preference synchronization, offscreen lifecycle`,
    );
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(base);
  await page.waitForTimeout(500);
  assert.equal(
    await page.locator(".living-crest canvas").count(),
    0,
    "system reduced motion avoids renderer",
  );
  assert.ok(
    await page
      .locator(".living-crest__poster")
      .evaluate((i) => i.complete && i.naturalWidth > 0),
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base);
  await page.locator('.living-crest[data-crest-state="active"]').waitFor();
  await page
    .locator(".living-crest canvas")
    .evaluate((c) => c.dispatchEvent(new Event("webglcontextlost")));
  await page.locator('.living-crest[data-crest-state="fallback"]').waitFor();
  assert.equal(
    await page.locator(".living-crest canvas").count(),
    0,
    "lost context released",
  );
  const fallback = await browser.newPage();
  await fallback.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      return String(kind).startsWith("webgl")
        ? null
        : original.call(this, kind, ...args);
    };
  });
  await fallback.goto(base);
  await fallback
    .locator('.living-crest[data-crest-state="fallback"]')
    .waitFor();
  assert.ok(await fallback.locator(".living-crest__poster").isVisible());
  await fallback.close();
  const saved = await browser.newPage();
  await saved.addInitScript(() =>
    localStorage.setItem("reserve-motion-v1", "still"),
  );
  await saved.goto(base);
  await saved.waitForTimeout(500);
  assert.equal(await saved.locator(".living-crest canvas").count(), 0);
  await saved.close();
  const fail = await browser.newPage();
  await fail.route("**/living-crest/height.png", (r) => r.abort());
  await fail.goto(base);
  await fail.locator('.living-crest[data-crest-state="fallback"]').waitFor();
  assert.equal(await fail.locator("canvas.living-crest__canvas").count(), 0);
  await fail.close();
  const touchPage = await browser.newPage({
    viewport: { width: 884, height: 900 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
  });
  await touchPage.goto(base);
  await touchPage.locator('.living-crest[data-crest-state="active"]').waitFor();
  assert.ok(
    await touchPage.evaluate(() => matchMedia("(pointer: coarse)").matches),
  );
  assert.ok(
    await touchPage
      .locator(".living-crest canvas")
      .evaluate((c) => c.width <= c.getBoundingClientRect().width + 1),
  );
  await touchPage.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await touchPage.locator('.living-crest[data-crest-state="paused"]').waitFor();
  const n = await touchPage
    .locator(".living-crest canvas")
    .getAttribute("data-render-count");
  await touchPage.waitForTimeout(250);
  assert.equal(
    await touchPage
      .locator(".living-crest canvas")
      .getAttribute("data-render-count"),
    n,
  );
  await touchPage.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await touchPage.locator('.living-crest[data-crest-state="active"]').waitFor();
  const cdp = await touchPage.context().newCDPSession(touchPage);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 700, y: 680 }],
  });
  for (let y = 620; y >= 260; y -= 60)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 700, y }],
    });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await touchPage.waitForTimeout(200);
  assert.ok(
    await touchPage.evaluate(() => scrollY > 100),
    "touch scroll is not captured",
  );

  await touchPage.close();
  const nojs = await browser.newPage({ javaScriptEnabled: false });
  await nojs.goto(base);
  assert.ok(
    await nojs
      .locator(".living-crest__poster")
      .evaluate((i) => i.complete && i.naturalWidth > 0),
  );
  assert.equal(await nojs.locator(".living-crest__motion").isVisible(), false);
  await nojs.close();
  assert.deepEqual(errors, []);
  console.log(
    "PASS reduced motion, context loss, unavailable WebGL, no-JS poster, zero page errors",
  );
} finally {
  await browser?.close();
  server.kill();
}
