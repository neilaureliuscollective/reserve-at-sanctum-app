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
  const jsonHeaders = { Origin: "http://localhost:3000" };
  const login = async (identity) => {
    const r = await context.request.post("http://localhost:3000/api/auth", {
      headers: jsonHeaders,
      data: { action: "preview", identity },
    });
    assert.equal(r.status(), 200);
  };
  const logout = async () => {
    const r = await context.request.post("http://localhost:3000/api/auth", {
      headers: jsonHeaders,
      data: { action: "signout" },
    });
    assert.equal(r.status(), 200);
  };
  await login("preview-client");
  await context.request.delete("http://localhost:3000/api/chair", {
    headers: { ...jsonHeaders, "Content-Type": "application/json" },
  });
  await logout();
  assert.equal(
    (await context.request.get("http://localhost:3000/api/chair")).status(),
    401,
  );
  assert.equal(
    (
      await context.request.get("http://localhost:3000/api/chair/studio")
    ).status(),
    401,
  );
  for (const width of [320, 360, 390, 540, 768, 884, 1024, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    for (const route of ["/fix-it-shop", "/chair"]) {
      await visit(route);
      await page.locator("main h1").waitFor();
      assert.equal(await page.locator("main h1").count(), 1);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `${route} overflow at ${width}`,
      );
      for (const img of await page.locator("main img").all())
        assert.ok(
          await img.evaluate((el) => el.complete && el.naturalWidth > 0),
        );
      if ([390, 884, 1440].includes(width))
        await page.screenshot({
          path: `artifacts/chair-${route.slice(1)}-${width}.png`,
          fullPage: true,
        });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await visit("/chair");
  // Keyboard-selected intent and deliberate continue; no forced auto-advance.
  await page
    .getByRole("radio", { name: "I need a reset.", exact: true })
    .focus();
  await page.keyboard.press("Space");
  assert.ok(
    await page
      .getByRole("radio", { name: "I need a reset.", exact: true })
      .isChecked(),
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  assert.equal(
    await page.locator("h1").evaluate((el) => el === document.activeElement),
    true,
  );
  await page
    .getByRole("radio", { name: "Got a lot going on.", exact: true })
    .check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("radio", { name: "Work", exact: true }).check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("radio", { name: "Give me some quiet.", exact: true })
    .check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("radio", { name: "More confident.", exact: true })
    .check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("radio", { name: "Wash and go", exact: true }).check();
  await page
    .getByRole("textbox", { name: /Anything practical/ })
    .fill("Keep length for next month.");
  await page
    .getByRole("button", { name: "See my check-in", exact: true })
    .click();
  await page.getByRole("heading", { name: "Your chair is ready." }).waitFor();
  assert.equal(
    await page
      .locator(".chair-summary")
      .getByText("Work", { exact: true })
      .count(),
    1,
  );
  await page.getByRole("checkbox", { name: /Share this check-in/ }).check();
  assert.equal(
    await page.getByRole("checkbox", { name: /Include my life/ }).isChecked(),
    false,
  );
  await page.getByRole("checkbox", { name: /Include my life/ }).check();
  await page.screenshot({
    path: "artifacts/chair-summary-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Save this for Katie", exact: true })
    .click();
  await page.waitForURL("**/signin?next=/chair");
  assert.ok(
    await page.evaluate(
      () =>
        JSON.parse(sessionStorage.getItem("reserve:chair-draft:v1")).value
          .life === "Got a lot going on.",
    ),
  );
  await page.getByRole("button", { name: /Experience a client visit/ }).click();
  await page.waitForURL("**/chair");
  await page.getByRole("heading", { name: "Your chair is ready." }).waitFor();
  assert.equal(
    (
      await (
        await context.request.get("http://localhost:3000/api/chair")
      ).json()
    ).profile,
    null,
    "No automatic save after sign-in",
  );
  let releaseSave;
  const saveGate = new Promise((resolve) => {
    releaseSave = resolve;
  });
  await page.route("**/api/chair", async (route) => {
    if (route.request().method() === "PUT") await saveGate;
    await route.continue();
  });
  await page
    .getByRole("button", { name: "Save this for Katie", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("checkbox", { name: /Share this check-in/ })
      .isDisabled(),
    true,
  );
  assert.equal(
    await page.getByRole("checkbox", { name: /Include my life/ }).isDisabled(),
    true,
  );
  releaseSave();

  await page
    .getByRole("status")
    .filter({ hasText: "Katie can open" })
    .waitFor();
  await page.unroute("**/api/chair");
  const saved = (
    await (await context.request.get("http://localhost:3000/api/chair")).json()
  ).profile;
  assert.equal(saved.conversation, "Give me some quiet.");
  assert.equal(saved.life, "Got a lot going on.");
  assert.equal("service_note" in saved, false);
  assert.equal(
    (
      await context.request.put("http://localhost:3000/api/chair", {
        headers: { Origin: "https://wrong.invalid" },
        data: {},
      })
    ).status(),
    403,
  );
  assert.equal(
    (
      await context.request.get("http://localhost:3000/api/chair/studio")
    ).status(),
    403,
  );
  // Returning users can reuse grooming, but the new-day emotional answers are cleared.
  await page.reload();
  await page.getByRole("heading", { name: "Your saved Chair." }).waitFor();
  await page
    .getByRole("button", {
      name: "New check-in · keep my grooming preferences",
    })
    .click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  assert.equal(
    await page
      .getByRole("radio", { name: "Got a lot going on.", exact: true })
      .isChecked(),
    false,
  );
  await page
    .getByRole("button", { name: "Skip this — no explanation needed" })
    .click();
  await page
    .getByRole("heading", { name: "What do you need from the chair?" })
    .waitFor();
  await login("preview-other");
  assert.equal(
    (
      await (
        await context.request.get("http://localhost:3000/api/chair")
      ).json()
    ).profile,
    null,
  );
  await login("preview-katie");
  await visit("/studio");
  await page
    .getByRole("button", { name: "Start Chair", exact: true })
    .first()
    .click();
  await page
    .locator(".chair-client-detail")
    .getByText("Got a lot going on.", { exact: true })
    .waitFor();
  await page
    .getByRole("textbox", { name: /Private service note/ })
    .fill("Keep the crown longer. Synthetic test only.");
  await page
    .getByRole("button", { name: "Save service note", exact: true })
    .click();
  await page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/chair/studio") && r.request().method() === "GET",
  );
  await page.getByRole("textbox", { name: /Private service note/ }).waitFor();
  assert.equal(
    await page
      .getByRole("textbox", { name: /Private service note/ })
      .inputValue(),
    "Keep the crown longer. Synthetic test only.",
  );
  for (const width of [320, 390, 768, 884, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `Studio overflows at ${width}`,
    );
  }
  await page.setViewportSize({ width: 884, height: 960 });
  await page.screenshot({
    path: "artifacts/chair-studio-fold.png",
    fullPage: true,
  });
  await login("preview-client");
  await visit("/chair");
  await page.getByRole("heading", { name: "Your saved Chair." }).waitFor();
  assert.equal(
    await page
      .getByText("Keep the crown longer. Synthetic test only.", { exact: true })
      .count(),
    0,
  );
  await page
    .getByRole("button", { name: "Edit sharing & saved details" })
    .click();
  await page.getByRole("checkbox", { name: /Share this check-in/ }).uncheck();
  await page
    .getByRole("button", { name: "Save to my Reserve", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Saved privately" })
    .waitFor();
  assert.equal(
    (
      await (
        await context.request.get("http://localhost:3000/api/chair")
      ).json()
    ).profile.life,
    "",
  );
  await login("preview-katie");
  assert.equal(
    (
      await (
        await context.request.get("http://localhost:3000/api/chair/studio")
      ).json()
    ).chairs.some((c) => c.user_id === "preview-client"),
    false,
  );
  await login("preview-client");
  await visit("/chair");
  await page
    .getByRole("button", { name: "Delete my Chair data", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Yes, delete my Chair data", exact: true })
    .click();
  await page.getByRole("status").filter({ hasText: "were deleted" }).waitFor();
  assert.equal(
    (
      await (
        await context.request.get("http://localhost:3000/api/chair")
      ).json()
    ).profile,
    null,
  );
  // Expired and malformed drafts cannot revive old personal context.
  await page.evaluate(() =>
    sessionStorage.setItem("reserve:chair-draft:v1", "{broken"),
  );
  await visit("/chair");
  await page
    .getByRole("heading", { name: "How are we showing up today?" })
    .waitFor();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await visit("/chair");
  assert.equal(
    await page
      .locator(".chair-options")
      .evaluate((el) => getComputedStyle(el).animationName),
    "none",
  );
  await page.evaluate(() => (document.documentElement.style.fontSize = "200%"));
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "200% text overflow",
  );
  await page.evaluate(() => (document.documentElement.style.fontSize = ""));
  assert.deepEqual(errors, []);
  await writeFile(
    "artifacts/chair-verification.json",
    JSON.stringify(
      {
        widths: [320, 360, 390, 540, 768, 884, 1024, 1440],
        consoleErrors: errors,
        flows: [
          "anonymous completion",
          "conditional life questions",
          "skip",
          "keyboard",
          "consent",
          "auth return without autosave",
          "persistence",
          "client isolation",
          "staff notes",
          "revocation",
          "deletion",
          "malformed draft",
          "reduced motion",
          "200% text",
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS Chair customer, account, studio, privacy, responsive, keyboard and reduced-motion checks.",
  );
} catch (e) {
  await writeFile("artifacts/chair-server.log", serverLog);
  throw e;
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
