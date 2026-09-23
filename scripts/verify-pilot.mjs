import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
if (process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)
  throw Error("Synthetic local environment only");
await mkdir("artifacts", { recursive: true });
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3000",
  ],
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
let serverLog = "";
server.stdout.on("data", (d) => (serverLog += d));
server.stderr.on("data", (d) => (serverLog += d));
try {
  await new Promise((resolve, reject) => {
    server.stdout.on("data", (d) => {
      if (String(d).includes("Ready in")) resolve();
    });
    server.on("exit", (c) => reject(Error("Server exited " + c)));
    setTimeout(() => reject(Error("Startup timed out")), 30000).unref();
  });
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/tmp/gent-browser/chromium",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("Failed to load resource"))
      errors.push(m.text());
  });
  const visit = async (path) => {
    await page.goto("http://localhost:3000" + path);
    await page.waitForLoadState("networkidle");
  };
  const origin = "http://localhost:3000";
  const login = async (identity) => {
    const r = await context.request.post(origin + "/api/auth", {
      headers: { Origin: origin },
      data: { action: "preview", identity },
    });
    assert.equal(r.status(), 200);
  };
  await login("preview-client");
  assert.equal(
    (await context.request.get(origin + "/api/studio/blocks")).status(),
    403,
  );
  await login("preview-katie");
  await visit("/setup");
  await page
    .getByText("Your studio access is ready.", { exact: false })
    .waitFor();
  const { DateTime } = await import("luxon");
  const date = DateTime.now()
    .setZone("America/Chicago")
    .plus({ days: 20 })
    .toISODate();
  const prior = await (
    await context.request.get(origin + "/api/studio/blocks")
  ).json();
  for (const block of prior.blocks) {
    const local = DateTime.fromISO(block.starts_at).setZone("America/Chicago");
    if (local.toISODate() === date && local.toFormat("HH:mm") === "07:00")
      await context.request.delete(origin + "/api/studio/blocks", {
        headers: { Origin: origin },
        data: { id: block.id },
      });
  }
  await visit("/studio");
  const section = page.locator(".studio-blocks");
  await section
    .getByRole("button", { name: "Block time", exact: true })
    .waitFor();
  await section.getByLabel("Date", { exact: true }).fill(date);
  await section.getByLabel("From", { exact: true }).fill("07:00");
  await section.getByLabel("Until", { exact: true }).fill("07:30");
  await section
    .getByRole("button", { name: "Block time", exact: true })
    .click();
  await section
    .getByText("Time blocked. Clients cannot book this time.", { exact: true })
    .waitFor();
  await page.reload();
  const remove = section.getByRole("button", { name: /Remove block starting/ });
  await remove.first().waitFor();
  assert.ok((await remove.count()) > 0);
  for (const width of [320, 390, 540, 768, 884, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `studio overflow ${width}`,
    );
    await page.screenshot({
      path: `artifacts/pilot-studio-${width}.png`,
      fullPage: true,
    });
  }
  await remove.last().click();
  await section
    .getByText(
      "Block removed. This time can be booked if it is within studio hours.",
      { exact: true },
    )
    .waitFor();
  const denied = await context.request.post(origin + "/api/studio/blocks", {
    headers: { Origin: "https://wrong.invalid" },
    data: { date, start: "07:00", end: "07:30" },
  });
  assert.equal(denied.status(), 403);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await visit("/setup");
  for (const width of [320, 390, 540, 768, 884, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `setup overflow ${width}`,
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS pilot: staff and client boundaries, time-block creation/persistence/removal, origin protection, six responsive widths, reduced-motion setup, no console errors.",
  );
} catch (e) {
  await writeFile("artifacts/pilot-server.log", serverLog);
  throw e;
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
