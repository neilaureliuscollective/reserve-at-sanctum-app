import { chromium } from "@playwright/test";
import { PGlite } from "@electric-sql/pglite";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
if (process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)
  throw Error(
    "Local synthetic verification only. Run after verify:operations with no dev server running.",
  );
const pg = new PGlite(".data/reserve");
await pg.waitReady;
const id = randomUUID();
await pg.query(
  "INSERT INTO reserve_appointments(id,client_id,provider_id,service_id,starts_at,ends_at,busy_until,price,status,note,request_key,original_start) VALUES($1,'preview-client','katie','signature',now()-interval '2 hours',now()-interval '1 hour',now()-interval '45 minutes',4500,'confirmed','',$2,now()-interval '2 hours')",
  [id, randomUUID()],
);
await pg.close();
const origin = "http://localhost:3003",
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3003",
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
  await context.route("**/*", (r) =>
    r.request().url().startsWith(origin) ? r.continue() : r.abort(),
  );
  await context.request.post(origin + "/api/auth", {
    headers: { Origin: origin },
    data: { action: "preview", identity: "preview-katie" },
  });
  await page.goto(origin + "/studio/schedule");
  const ref = id.slice(0, 8).toUpperCase();
  const article = page.locator("article").filter({ hasText: ref });
  await article
    .getByRole("button", { name: "Mark complete", exact: true })
    .click();
  await page
    .getByText("Visit marked complete. No payment has been recorded.", {
      exact: true,
    })
    .waitFor();
  await article
    .getByRole("link", { name: "Create follow-up task", exact: false })
    .click();
  await page.getByLabel("Kind").waitFor();
  assert.equal(await page.getByLabel("Kind").inputValue(), "task");
  assert.equal(
    await page.getByLabel("What needs to happen?").inputValue(),
    `Follow-up · visit ${ref}`,
  );
  await page.getByRole("button", { name: "Save work", exact: true }).click();
  await page
    .getByText("Saved in the shared workspace.", { exact: true })
    .waitFor();
  const data = await (
    await context.request.get(origin + "/api/studio/command")
  ).json();
  const task = data.items.find((t) => t.title === `Follow-up · visit ${ref}`);
  assert.equal(task.kind, "task");
  assert.ok(task.detail.includes("no message has been sent"));
  assert.deepEqual(errors, []);
  console.log(
    "PASS: completed visit in schedule; provider-scoped follow-up draft; explicit internal task save; no page errors.",
  );
} finally {
  await browser?.close();
  server.kill("SIGTERM");
  await writeFile("artifacts/completion-browser.log", logs);
}
