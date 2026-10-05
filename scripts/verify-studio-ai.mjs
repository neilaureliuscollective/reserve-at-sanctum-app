import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
if (process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)
  throw Error("Local synthetic verification only.");
const origin = "http://localhost:3001";
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3001",
  ],
  {
    env: {
      ...process.env,
      RESERVE_DEV_PREVIEW: "true",
      APP_ORIGIN: origin,
      OPENAI_API_KEY: "synthetic-browser-test-only",
      NEXT_TELEMETRY_DISABLED: "1",
      NODE_OPTIONS:
        "--require=" + process.cwd() + "/scripts/local-browser-offline.cjs",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let browser,
  logs = "";
server.stdout.on("data", (d) => (logs += d));
server.stderr.on("data", (d) => (logs += d));
try {
  await new Promise((resolve, reject) => {
    server.stdout.on("data", (d) => {
      if (String(d).includes("Ready in")) resolve();
    });
    server.on("exit", (c) => reject(Error("Server exit " + c)));
    setTimeout(() => reject(Error("Startup timed out")), 30000).unref();
  });
  await mkdir("artifacts", { recursive: true });
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await context.route("**/*", (route) =>
    route.request().url().startsWith(origin) ? route.continue() : route.abort(),
  );
  const login = async (identity) => {
    assert.equal(
      (
        await context.request.post(origin + "/api/auth", {
          headers: { Origin: origin },
          data: { action: "preview", identity },
        })
      ).status(),
      200,
    );
  };
  await login("preview-client");
  assert.equal(
    (
      await context.request.post(origin + "/api/studio/aethelios", {
        headers: { Origin: origin },
        data: { prompt: "Hello" },
      })
    ).status(),
    403,
  );
  await login("preview-katie");
  assert.equal(
    (
      await context.request.post(origin + "/api/studio/aethelios", {
        headers: { Origin: "https://invalid.example" },
        data: { prompt: "Hello" },
      })
    ).status(),
    403,
  );
  assert.equal(
    (
      await context.request.post(origin + "/api/studio/aethelios", {
        headers: { Origin: origin },
        data: { prompt: "Hello", user_id: "preview-neil" },
      })
    ).status(),
    400,
  );
  await page.goto(origin + "/studio/content");
  await page.getByLabel("Draft title").fill("AI editing test");
  await page.getByLabel("Your copy").fill("Original copy");
  let fail = false;
  await page.route("**/api/studio/aethelios", async (route) => {
    const payload = route.request().postDataJSON();
    assert.equal(payload.draft, "Original copy");
    assert.equal(payload.room, "content");
    await route.fulfill({
      status: fail ? 503 : 200,
      contentType: "application/json",
      body: JSON.stringify(
        fail
          ? { error: "Test connection failed" }
          : { answer: "A refined welcome for the Reserve." },
      ),
    });
  });
  await page.getByRole("button", { name: "Shape with Aethelios" }).click();
  await page.getByLabel("What are we working on?").fill("Refine this welcome");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Ask Aethelios", exact: true })
    .click();
  await page
    .getByText("A refined welcome for the Reserve.", { exact: true })
    .waitFor();
  await page.screenshot({
    path: "artifacts/studio-assistant-390.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Use in draft", exact: true }).click();
  assert.equal(
    await page.getByLabel("Your copy").inputValue(),
    "A refined welcome for the Reserve.",
  );
  assert.ok(
    (await page.getByLabel("Writing workspace").innerText()).includes(
      "Unsaved",
    ),
  );
  await page.getByLabel("Your copy").fill("Original copy");
  fail = true;
  await page.getByRole("button", { name: "Shape with Aethelios" }).click();
  await page.getByLabel("What are we working on?").fill("Refine this welcome");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Ask Aethelios", exact: true })
    .click();
  await page.getByRole("alert").getByText("Test connection failed").waitFor();
  await page.getByRole("button", { name: "Close Aethelios" }).click();
  assert.equal(
    await page.getByLabel("Your copy").inputValue(),
    "Original copy",
  );
  for (const width of [320, 390, 884, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({
      path: `artifacts/studio-content-${width}.png`,
      fullPage: true,
    });
  }
  // An internal navigation cannot silently discard unsaved content.
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("link", { name: "Schedule", exact: true }).click();
  assert.ok(page.url().endsWith("/studio/content"));
  assert.deepEqual(errors, []);
  console.log(
    "PASS: mocked AI suggestion/use/error; client and origin denial; draft unchanged on failure; unsaved navigation guard; content layouts at four widths.",
  );
} finally {
  await browser?.close();
  server.kill("SIGTERM");
  await writeFile("artifacts/studio-ai-browser.log", logs);
}
