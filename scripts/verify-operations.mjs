import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
if (process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)
  throw Error("Local synthetic verification only.");
const origin = "http://localhost:3002",
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3002",
    ],
    {
      env: {
        ...process.env,
        RESERVE_DEV_PREVIEW: "true",
        APP_ORIGIN: origin,
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
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await context.route("**/*", (r) =>
    r.request().url().startsWith(origin) ? r.continue() : r.abort(),
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
  const overview = async () =>
    await (await context.request.get(origin + "/api/studio/operations")).json();
  const patch = async (body) =>
    context.request.patch(origin + "/api/studio/operations", {
      headers: { Origin: origin },
      data: body,
    });
  await login("preview-client");
  assert.equal(
    (await context.request.get(origin + "/api/studio/operations")).status(),
    403,
  );
  await login("preview-katie");
  await page.goto(origin + "/studio/operations");
  await page
    .getByRole("button", { name: "Propose a service", exact: true })
    .click();
  const title = "Synthetic service " + Date.now();
  await page.getByLabel("Service name", { exact: true }).fill(title);
  await page
    .getByLabel("Service description")
    .fill("Synthetic local service proposal.");
  await page.getByLabel("Duration (minutes)").fill("45");
  await page.getByLabel("Buffer (minutes)").fill("15");
  await page.getByLabel("Service price (USD)").fill("55.50");
  await page
    .getByRole("button", { name: "Save proposal", exact: true })
    .click();
  await page.getByText("Proposal saved.", { exact: false }).waitFor();
  const proposal = (await overview()).proposals.find(
    (p) => p.payload.name === title,
  );
  assert.ok(proposal);
  assert.ok(!(await overview()).services.some((s) => s.name === title));
  assert.equal(
    (await patch({ id: proposal.id, action: "apply" })).status(),
    403,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Approve and apply", exact: true })
      .count(),
    0,
  );
  await login("preview-neil");
  await page.goto(origin + "/studio");
  await page
    .getByText("operating changes for review", { exact: false })
    .waitFor();
  await page.goto(origin + "/studio/operations?view=review");
  const article = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
  await article
    .getByRole("button", { name: "Approve and apply", exact: true })
    .click();
  await page
    .getByText("Approved settings applied.", { exact: false })
    .waitFor();
  assert.equal(
    (await overview()).services.find((s) => s.name === title).price,
    5550,
  );
  await page.getByRole("button", { name: "Availability", exact: true }).click();
  await page
    .getByRole("button", { name: "Propose provider setup", exact: true })
    .click();
  const id = "synthetic-" + Date.now();
  await page.getByLabel("Provider identifier").fill(id);
  await page
    .getByLabel("Provider name", { exact: true })
    .fill("Synthetic Provider");
  await page.getByLabel("Mon", { exact: true }).check();
  await page.getByLabel("Opening hour (CT)").selectOption("9");
  await page.getByLabel("Closing hour (CT)").selectOption("17");
  await page
    .getByRole("button", { name: "Save proposal", exact: true })
    .click();
  await page.getByText("Proposal saved.", { exact: false }).waitFor();
  const providerArticle = page
    .locator("article")
    .filter({
      has: page.getByRole("heading", {
        name: "Synthetic Provider",
        exact: true,
      }),
    });
  await providerArticle
    .getByRole("button", { name: "Approve and apply", exact: true })
    .click();
  await page
    .getByText("Approved settings applied.", { exact: false })
    .waitFor();
  assert.equal(
    (await overview()).providers.find((p) => p.id === id).enabled,
    false,
  );
  for (const identity of ["preview-neil", "preview-katie"]) {
    await login(identity);
    for (const width of [320, 390, 884, 1440]) {
      await page.setViewportSize({ width, height: 960 });
      for (const view of ["menu", "availability", "review"]) {
        await page.goto(`${origin}/studio/operations?view=${view}`);
        await page
          .getByRole("heading", { name: "Ready to operate." })
          .waitFor();
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
          `${identity} ${view} ${width}`,
        );
        if (view === "menu")
          await page.screenshot({
            path: `artifacts/operations-${identity}-${width}.png`,
            fullPage: true,
          });
      }
    }
  }
  await login("preview-katie");
  const data = await overview();
  assert.ok(!data.providers.some((p) => p.id === id));
  assert.equal(
    (
      await context.request.post(origin + "/api/studio/operations", {
        headers: { Origin: origin },
        data: {
          kind: "provider",
          provider_id: id,
          target_revision: 1,
          name: "Forgery",
          open_hour: 9,
          close_hour: 17,
          weekdays: [1],
          enabled: false,
        },
      })
    ).status(),
    403,
  );
  assert.equal(
    (
      await context.request.post(origin + "/api/studio/operations", {
        headers: { Origin: "https://invalid.example" },
        data: {},
      })
    ).status(),
    403,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: service proposal persistence and owner apply; closed provider creation; operator/client/origin isolation; responsive menu/availability/review at four widths; no page errors.",
  );
} finally {
  await browser?.close();
  server.kill("SIGTERM");
  await writeFile("artifacts/operations-browser.log", logs);
}
