import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { DateTime } from "luxon";
const base = "http://localhost:3000";
if (process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)
  throw Error("Synthetic verification is isolated local only");
const pg = new PGlite(".data/reserve");
await pg.waitReady;
await pg.query(
  "DELETE FROM reserve_member_routines WHERE user_id IN ('preview-client','preview-other')",
);
await pg.query(
  "DELETE FROM reserve_concierge_rate WHERE user_id IN ('preview-client','preview-other')",
);
await pg.close();
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
      APP_ORIGIN: base,
      RESERVE_CONCIERGE_MODEL: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let log = "";
server.stdout.on("data", (d) => (log += d));
server.stderr.on("data", (d) => (log += d));
let browser;
try {
  await new Promise((resolve, reject) => {
    server.stdout.on("data", (d) => {
      if (String(d).includes("Ready in")) resolve();
    });
    server.on("exit", (c) => reject(Error(`server exited ${c}`)));
    setTimeout(() => reject(Error("Startup timeout")), 30000).unref();
  });
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  await mkdir("artifacts/personal-reserve", { recursive: true });
  const client = await browser.newContext(),
    other = await browser.newContext(),
    staff = await browser.newContext();
  const errors = [];
  const page = await client.newPage();
  page.setDefaultTimeout(20000);
  page.on("pageerror", (e) => errors.push(e.message));
  const post = (ctx, path, data, origin = base) =>
    ctx.request.post(base + path, { headers: { Origin: origin }, data });
  assert.equal(
    (
      await post(client, "/api/routine", {
        priority: "presence",
        title: "X",
        steps: ["X"],
        revision: 0,
      })
    ).status(),
    401,
  );
  for (const [ctx, identity] of [
    [client, "preview-client"],
    [other, "preview-other"],
    [staff, "preview-katie"],
  ])
    assert.equal(
      (await post(ctx, "/api/auth", { action: "preview", identity })).status(),
      200,
    );
  assert.equal(
    (
      await post(client, "/api/routine", {}, "https://untrusted.invalid")
    ).status(),
    403,
  );
  assert.equal(
    (
      await post(staff, "/api/aethelios/member", {
        message: "What benefits do I have?",
      })
    ).status(),
    403,
  );
  assert.equal(
    (
      await post(client, "/api/aethelios/member", {
        message: "Hi",
        userId: "preview-other",
      })
    ).status(),
    400,
  );
  await page.goto(base + "/pathways?priority=performance#routine");
  await page
    .getByRole("heading", { name: "One priority. A useful rhythm." })
    .waitFor();
  await page.getByLabel("Routine title").fill("Jordan’s daily standard");
  await page
    .getByLabel("Your steps — one per line")
    .fill("Walk for ten minutes\nPrepare tomorrow’s essentials");
  await page.getByRole("button", { name: "Save routine", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Your routine is saved" })
    .waitFor();
  await page.goto(base + "/home");
  await page
    .getByRole("heading", { name: "Jordan’s daily standard" })
    .waitFor();
  assert.equal(
    (await other.request.get(base + "/api/routine").then((r) => r.json()))
      .routine,
    null,
  );
  const own = await client.request
    .get(base + "/api/routine")
    .then((r) => r.json());
  assert.equal(
    (
      await post(client, "/api/routine", {
        priority: "performance",
        title: "Stale",
        steps: ["Move"],
        revision: 0,
      })
    ).status(),
    409,
  );
  await page.goto(base + "/aethelios");
  await page.getByRole("button", { name: "What benefits do I have?" }).click();
  await page
    .getByText(/You do not currently have an assigned membership/)
    .waitFor();
  await page
    .getByRole("button", { name: "Help me build a workout routine" })
    .click();
  await page.getByRole("link", { name: "Review this foundation" }).waitFor();
  await page.getByRole("button", { name: "Find an appointment" }).click();
  await page.getByRole("heading", { name: "Choose an exact date." }).waitFor();
  let date = DateTime.now().setZone("America/Chicago").plus({ days: 8 });
  while (date.weekday > 5) date = date.plus({ days: 1 });
  await page.getByLabel("Date", { exact: true }).fill(date.toISODate());
  await page.getByRole("button", { name: "Check available times" }).click();
  await page.getByText(/no appointment has been made/).waitFor();
  const slots = page.locator('.concierge-links a[href*="start="]');
  assert.ok((await slots.count()) > 0);
  assert.ok((await slots.first().getAttribute("href")).startsWith("/book?"));
  await page.getByLabel("Ask Aethelios").fill("Tell me about peptide dosing");
  await page.getByRole("button", { name: "Send" }).click();
  await page.getByText(/does not recommend dosing/).waitFor();
  await page.getByRole("button", { name: "Explore grooming products" }).click();
  await page.getByText(/not verified inventory/).waitFor();
  for (const width of [320, 360, 390, 884, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/aethelios", "/pathways", "/visit", "/home"]) {
      if (!page.url().endsWith(path)) await page.goto(base + path);
      await page.locator("main h1:visible").waitFor();
      await page.waitForLoadState("networkidle");
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
        `${path} overflow ${width}`,
      );
      if ([320, 390, 1440].includes(width))
        await page.screenshot({
          path: `artifacts/personal-reserve/${path.slice(1)}-${width}.png`,
          fullPage: true,
        });
    }
  }
  // Conversation is not retained across a navigation, even when returning via history.
  await page.goto(base + "/aethelios");
  assert.equal(await page.locator(".concierge-thread article").count(), 0);
  const memberMenu = page.getByRole("navigation", {
    name: "Legacy Reserve navigation",
  });
  await memberMenu.getByRole("link", { name: "Reserve", exact: true }).click();
  await page.goBack();
  await page.locator("main h1:visible").waitFor();
  assert.equal(await page.locator(".concierge-thread article").count(), 0);
  assert.equal(
    await page.evaluate(() =>
      Object.keys(localStorage).some((k) => /concierge|aethelios/.test(k)),
    ),
    false,
  );
  await page.goto(base + "/pathways");
  await page.getByRole("button", { name: "Clear saved routine" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "saved routine was cleared" })
    .waitFor();
  const cleared = await client.request
    .get(base + "/api/routine")
    .then((r) => r.json());
  assert.equal(cleared.routine.cleared, true);
  assert.equal(cleared.routine.revision, own.routine.revision + 1);
  assert.deepEqual(errors, []);
  await writeFile("artifacts/personal-reserve/server.log", log);
  console.log(
    "PASS: routine save/home/clear; ownership/stale/origin/role/input guards; real availability handoff; membership/clinical/commerce truth; session-only chat; 320/360/390/884/1440 layouts; no page errors.",
  );
} finally {
  await mkdir("artifacts/personal-reserve", { recursive: true });
  await writeFile("artifacts/personal-reserve/server.log", log);
  await browser?.close();
  server.kill("SIGTERM");
}
