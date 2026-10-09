import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const posters = process.argv.includes("--posters");
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3124",
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);
let log = "",
  browser;
server.stdout.on("data", (d) => (log += d));
server.stderr.on("data", (d) => (log += d));
const url = "http://127.0.0.1:3124/discover";
const worlds = [
  ["presence", "Presence", "/pathways?priority=presence#routine"],
  ["performance", "Performance", "/pathways?priority=performance#routine"],
  ["wellness", "Vitalis", "/vitalis/journey"],
];
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
  await mkdir("artifacts/sculptures", { recursive: true });
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const sculpture = page.locator(".signature-sculpture:not(.is-quiet)");
  await page.goto(url);
  if (posters) {
    for (const [id, name] of worlds) {
      await page
        .locator(".digital-world-controls")
        .getByRole("button", { name: new RegExp(name) })
        .click();
      await sculpture.scrollIntoViewIfNeeded();
      await page
        .locator(".signature-sculpture[data-sculpture-state=active]")
        .waitFor();
      // Read before composition, so only the transparent canvas enters the poster.
      const data = await page
        .locator(".signature-sculpture__canvas")
        .evaluate(
          (canvas) =>
            new Promise((resolve) =>
              requestAnimationFrame(() =>
                resolve(canvas.toDataURL("image/png")),
              ),
            ),
        );
      await writeFile(
        `artifacts/sculptures/${id}-clean.png`,
        Buffer.from(data.split(",")[1], "base64"),
      );
      console.log("Captured transparent sculpture:", id);
    }
  } else {
    for (const width of process.argv.includes("--lifecycle")
      ? []
      : [320, 390, 430, 700, 768, 884, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(url);
      for (const [id, name, href] of worlds) {
        await page
          .locator(".digital-world-controls")
          .getByRole("button", { name: new RegExp(name) })
          .click();
        await sculpture.scrollIntoViewIfNeeded();
        await page
          .locator(".signature-sculpture[data-sculpture-state=active]")
          .waitFor();
        assert.equal(await sculpture.getAttribute("data-world"), id);
        assert.equal(await sculpture.locator("canvas").count(), 1);
        assert.equal(
          await page.locator(".signature-sculpture canvas").count(),
          1,
          "only selected sculpture renders",
        );
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `overflow ${width}`,
        );
        assert.equal(
          await page
            .locator(".digital-world-copy .button")
            .getAttribute("href"),
          href,
        );
        const budget = await sculpture.locator("canvas").evaluate((el) => ({
          calls: Number(el.dataset.drawCalls),
          triangles: Number(el.dataset.triangles),
        }));
        assert.ok(
          budget.calls <= 16 && budget.triangles < 10000,
          JSON.stringify(budget),
        );
        await sculpture.locator("img").evaluate((img) => img.decode());
        const alpha = await sculpture.locator("img").evaluate((img) => {
          const c = document.createElement("canvas");
          c.width = c.height = 1;
          const ctx = c.getContext("2d");
          ctx.drawImage(img, 0, 0);
          return ctx.getImageData(0, 0, 1, 1).data[3];
        });
        assert.equal(alpha, 0, "poster has transparent corners");
      }
      if ([390, 1440].includes(width))
        await page.locator(".digital-selector").screenshot({
          path: `artifacts/sculptures/selector-${width}.png`,
          animations: "disabled",
        });
      console.log(
        "PASS three silhouettes, links and rendering budget at",
        width,
      );
    }
    // Rapid selection must dispose the outgoing scene and never produce duplicate canvases.
    await page.setViewportSize({ width: 1440, height: 1000 });
    for (let i = 0; i < 9; i++)
      await page
        .locator(".digital-world-controls button")
        .nth(i % 3)
        .click();
    await sculpture.scrollIntoViewIfNeeded();
    await page
      .locator(".signature-sculpture[data-sculpture-state=active]")
      .waitFor();
    assert.equal(await sculpture.locator("canvas").count(), 1);
    await page
      .getByRole("button", { name: "Pause sculpture and environment motion" })
      .click();
    await page
      .locator(
        ".signature-sculpture:not(.is-quiet)[data-sculpture-state=poster]",
      )
      .waitFor();
    assert.equal(await sculpture.locator("canvas").count(), 0);
    await page.locator(".experience-menu summary").click();
    assert.ok(
      await page
        .getByRole("button", { name: "Enable environment motion", exact: true })
        .isVisible(),
    );
    await page.locator(".experience-menu summary").click();
    await page.reload();
    await sculpture.scrollIntoViewIfNeeded();
    assert.equal(await sculpture.locator("canvas").count(), 0, "saved still");
    await page
      .getByRole("button", { name: "Enable sculpture and environment motion" })
      .click();
    await page
      .locator(".signature-sculpture[data-sculpture-state=active]")
      .waitFor();
    await page.locator(".living-crest").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    assert.equal(
      await sculpture.locator("canvas").count(),
      0,
      "offscreen scene disposed",
    );
    await sculpture.scrollIntoViewIfNeeded();
    await page
      .locator(".signature-sculpture[data-sculpture-state=active]")
      .waitFor();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(150);
    assert.equal(await sculpture.locator("canvas").count(), 0);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page
      .locator(".signature-sculpture[data-sculpture-state=active]")
      .waitFor();
    await sculpture
      .locator("canvas")
      .evaluate((c) =>
        c.getContext("webgl2").getExtension("WEBGL_lose_context").loseContext(),
      );
    await page
      .locator(".signature-sculpture[data-sculpture-state=fallback]")
      .waitFor();
    assert.equal(await sculpture.locator("canvas").count(), 0);
    assert.ok(await sculpture.locator("img").isVisible());
    console.log(
      "PASS selection, pause, re-entry, reduced motion and context loss",
    );
    const blocked = await browser.newPage();
    await blocked.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        return /webgl/.test(type) ? null : original.call(this, type, ...args);
      };
    });
    await blocked.goto(url);
    await blocked
      .locator(".signature-sculpture:not(.is-quiet)")
      .scrollIntoViewIfNeeded();
    await blocked
      .locator(".signature-sculpture[data-sculpture-state=fallback]")
      .waitFor();
    console.log("PASS unavailable WebGL");
    await blocked.close();
    const nojs = await browser.newPage({ javaScriptEnabled: false });
    await nojs.goto(url);
    assert.equal(await nojs.locator(".signature-sculpture canvas").count(), 0);
    await nojs
      .locator(".signature-sculpture__poster")
      .first()
      .evaluate((img) => img.decode());
    assert.equal(
      await nojs.locator(".signature-sculpture__motion:visible").count(),
      0,
    );
    await nojs.close();
    const mobile = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
    });
    await mobile.goto(url);
    await mobile
      .locator(".signature-sculpture:not(.is-quiet)")
      .scrollIntoViewIfNeeded();
    await mobile
      .locator(".signature-sculpture[data-sculpture-state=active]")
      .waitFor();
    assert.ok(
      await mobile
        .locator(".signature-sculpture__canvas")
        .evaluate((c) => c.width <= c.getBoundingClientRect().width + 1),
    );
    assert.equal(
      await mobile
        .locator(".signature-sculpture__art")
        .first()
        .evaluate((e) => getComputedStyle(e).touchAction),
      "pan-y",
    );
    await mobile.close();
    assert.deepEqual(errors, []);
    console.log(
      "PASS rapid switch, shared pause, saved still, offscreen release, reduced motion, context loss, unavailable WebGL, no-JS and coarse-pointer cap; zero page errors",
    );
  }
} finally {
  await browser?.close();
  server.kill();
}
