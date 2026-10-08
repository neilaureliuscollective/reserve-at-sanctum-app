import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
if (process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)
  throw Error("Local synthetic verification only");
await mkdir("artifacts", { recursive: true });
await writeFile("artifacts/studio-loading-state.json", "{}");
const origin = "http://localhost:3000";
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--webpack",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3000",
  ],
  {
    env: {
      ...process.env,
      RESERVE_DEV_PREVIEW: "true",
      RESERVE_STUDIO_STALL_FIXTURE: "true",
      APP_ORIGIN: origin,
      NODE_OPTIONS:
        "--import=" +
        process.cwd() +
        "/scripts/fixtures/studio-stalled-read.mjs",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let logs = "",
  browser;
server.stdout.on("data", (d) => (logs += d));
server.stderr.on("data", (d) => (logs += d));
try {
  await new Promise((resolve, reject) => {
    server.stdout.on("data", (d) => {
      if (String(d).includes("Ready in")) resolve();
    });
    server.on("exit", (c) => reject(Error("Server exit " + c)));
    setTimeout(() => reject(Error("Startup timeout")), 30000).unref();
  });
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext(),
    page = await context.newPage();
  page.setDefaultTimeout(25000);
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error")
      console.log("Browser console:", message.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  for (const [identity, width] of [
    ["preview-neil", 390],
    ["preview-katie", 320],
  ]) {
    assert.equal(
      (
        await context.request.post(origin + "/api/auth", {
          headers: { Origin: origin },
          data: { action: "preview", identity },
        })
      ).status(),
      200,
    );
    await page.setViewportSize({ width, height: 844 });
    await page.goto(origin + "/studio");
    await page.locator("main h1").first().waitFor();
    const rooms = await page
      .getByRole("navigation", { name: "Studio rooms" })
      .getByRole("link")
      .evaluateAll((nodes) =>
        nodes.map((n) => ({
          href: n.getAttribute("href"),
          name: n.textContent.trim(),
        })),
      );
    for (const room of rooms) {
      await page
        .getByRole("navigation", { name: "Studio rooms" })
        .getByRole("link", { name: room.name, exact: true })
        .click();

      await page.waitForURL(origin + room.href);
      await page.waitForLoadState("networkidle");
      await page.locator("main h1").first().waitFor();
      if (room.href === "/studio/schedule") {
        for (const text of [
          "Opening your appointment book…",
          "Loading blocked time…",
          "Opening shared check-ins…",
        ])
          await page
            .getByText(text, { exact: true })
            .waitFor({ state: "hidden" });
        assert.equal(await page.locator(".error-message:visible").count(), 0);
      }
      assert.equal(
        await page
          .getByText("Bringing your work into focus…", { exact: true })
          .isVisible(),
        false,
        room.href,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
        room.href,
      );
    }
  }
  assert.equal(
    (
      await context.request.post(origin + "/api/auth", {
        headers: { Origin: origin },
        data: { action: "preview", identity: "preview-neil" },
      })
    ).status(),
    200,
  );
  await writeFile("artifacts/studio-loading-state.json", '{"stall":true}');
  await page.goto(origin + "/studio/content", { waitUntil: "commit" });
  await page
    .getByText("Bringing your work into focus…", { exact: true })
    .waitFor();
  // The read remains pending: recovery must work before React hydration completes.
  const reload = page.waitForRequest(
    (r) => r.isNavigationRequest() && r.url() === origin + "/studio/content",
  );
  await writeFile("artifacts/studio-loading-state.json", "{}");
  await page.getByRole("link", { name: "Reload this room" }).click();
  await reload;
  await page.locator("main h1").first().waitFor();
  assert.equal(
    await page
      .getByText("Bringing your work into focus…", { exact: true })
      .isVisible(),
    false,
  );
  await writeFile("artifacts/studio-loading-state.json", '{"stall":true}');
  await page.goto(origin + "/studio/content", { waitUntil: "commit" });
  await page
    .getByText("Bringing your work into focus…", { exact: true })
    .waitFor();
  await page.getByRole("link", { name: "Open Schedule" }).click();
  await page.getByRole("heading", { name: "Time, well placed." }).waitFor();
  await writeFile("artifacts/studio-loading-state.json", "{}");
  await page.waitForLoadState("networkidle");
  await page.screenshot({
    path: "artifacts/studio-loading-fixed-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: every owner/operator Studio room renders after room navigation; narrow mobile no overflow; stalled read recovers through a native reload before hydration; independent Schedule escape works while the workspace read is pending; no page errors.",
  );
} finally {
  await writeFile("artifacts/studio-loading-state.json", "{}");
  await writeFile("artifacts/studio-loading-server.log", logs);
  await browser?.close();
  server.kill("SIGTERM");
}
