import { chromium } from "@playwright/test";
import { PGlite } from "@electric-sql/pglite";
import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
if (process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)
  throw Error("Local synthetic verification only");
await mkdir("artifacts/vitalis-revenue", { recursive: true });
const pg = new PGlite(".data/reserve");
await pg.waitReady;
for (const f of (await readdir("migrations"))
  .filter((n) => /^\d+.*\.sql$/.test(n))
  .sort())
  for (const statement of (await readFile("migrations/" + f, "utf8"))
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean))
    await pg.query(statement);
await pg.query(
  "DELETE FROM reserve_vitalis_forecasts WHERE updated_by='preview-neil'",
);
await pg.query("DELETE FROM reserve_vitalis_rate WHERE user_id='preview-neil'");
await pg.close();
const base = "http://127.0.0.1:3100",
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--webpack",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3100",
    ],
    {
      env: { ...process.env, RESERVE_DEV_PREVIEW: "true", APP_ORIGIN: base },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
let log = "",
  browser;
server.stdout.on("data", (d) => (log += d));
server.stderr.on("data", (d) => (log += d));
try {
  await new Promise((resolve, reject) => {
    server.stdout.on(
      "data",
      (d) => String(d).includes("Ready in") && resolve(),
    );
    server.on("exit", (c) => reject(Error("Server exit " + c)));
    setTimeout(() => reject(Error("Startup timeout")), 30000).unref();
  });
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const guest = await browser.newContext(),
    owner = await browser.newContext(),
    staff = await browser.newContext(),
    client = await browser.newContext(),
    errors = [];
  const post = (ctx, path, data, origin = base) =>
    ctx.request.post(base + path, { headers: { Origin: origin }, data });
  assert.equal(
    (await guest.request.get(base + "/api/studio/vitalis/revenue")).status(),
    401,
  );
  for (const [ctx, identity] of [
    [owner, "preview-neil"],
    [staff, "preview-katie"],
    [client, "preview-client"],
  ])
    assert.equal(
      (await post(ctx, "/api/auth", { action: "preview", identity })).status(),
      200,
    );
  for (const ctx of [staff, client]) {
    assert.equal(
      (await ctx.request.get(base + "/api/studio/vitalis/revenue")).status(),
      403,
    );
    assert.equal(
      (await post(ctx, "/api/studio/vitalis/revenue", {})).status(),
      403,
    );
  }
  const page = await guest.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/vitalis/membership");
  await page
    .getByRole("heading", {
      name: "A lasting relationship. A more vital life.",
    })
    .waitFor();
  assert.equal(
    await page.getByRole("button", { name: /buy|subscribe|pay/i }).count(),
    0,
  );
  for (const width of [320, 360, 390, 884, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.screenshot({
      path: `artifacts/vitalis-revenue/member-${width}.png`,
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      "public overflow " + width,
    );
  }
  const op = await owner.newPage();
  op.on("pageerror", (e) => errors.push(e.message));
  await op.setViewportSize({ width: 390, height: 950 });
  await op.goto(base + "/studio/vitalis/revenue");
  await op.getByRole("heading", { name: "Revenue intelligence." }).waitFor();
  await op
    .getByRole("heading", { name: "Compare the three drafts." })
    .waitFor();
  assert.ok(
    await op
      .getByText("Unavailable · billing ledger unconnected", { exact: true })
      .isVisible(),
  );
  await op
    .getByText("Tier prices, mix, servicing and medication inclusion", {
      exact: true,
    })
    .click();
  const prices = op.getByLabel("Optimize Monthly price", { exact: true });
  await prices.fill("159");
  await op.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  const saving = op.waitForResponse(
    (r) =>
      r.url().endsWith("/api/studio/vitalis/revenue") &&
      r.request().method() === "POST",
  );
  await op
    .getByRole("button", { name: "Save planning scenario", exact: true })
    .click();
  assert.equal((await saving).status(), 200);
  await op
    .getByRole("status")
    .filter({ hasText: "Planning scenario saved" })
    .waitFor();
  let saved = await (
    await owner.request.get(base + "/api/studio/vitalis/revenue")
  ).json();
  const draft = saved.scenarios.find((r) => r.key === "base");
  assert.equal(draft.assumptions.tiers[1].price, 159);
  assert.equal(draft.revision, 1);
  assert.equal(saved.actuals.paidRevenue, null);
  assert.equal(
    (
      await post(owner, "/api/studio/vitalis/revenue", {
        key: "base",
        revision: 0,
        assumptions: draft.assumptions,
      })
    ).status(),
    409,
  );
  assert.equal(
    (
      await post(
        owner,
        "/api/studio/vitalis/revenue",
        { key: "base", revision: 1, assumptions: draft.assumptions },
        "https://untrusted.invalid",
      )
    ).status(),
    403,
  );
  assert.equal(
    (
      await post(owner, "/api/studio/vitalis/revenue", {
        key: "base",
        revision: 1,
        assumptions: draft.assumptions,
        patient: "not allowed",
      })
    ).status(),
    400,
  );
  await op.reload();
  await op
    .getByText("Tier prices, mix, servicing and medication inclusion", {
      exact: true,
    })
    .click();
  await op.getByLabel("Optimize Monthly price", { exact: true }).waitFor();
  assert.equal(
    await op.getByLabel("Optimize Monthly price", { exact: true }).inputValue(),
    "159",
  );
  await op
    .getByLabel("Essential New-member mix (%)", { exact: true })
    .fill("50");
  await op
    .getByRole("alert")
    .filter({ hasText: "mix must total 100%" })
    .waitFor();
  assert.ok(
    await op
      .getByRole("button", { name: "Save planning scenario", exact: true })
      .isDisabled(),
  );
  await op
    .getByLabel("Essential New-member mix (%)", { exact: true })
    .fill("25");
  await op
    .getByLabel("Optimize model medication inclusion", { exact: true })
    .check();
  await op.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  const dl = op.waitForEvent("download");
  await op
    .getByRole("button", { name: "Download monthly forecast CSV", exact: true })
    .click();
  const file = await dl;
  assert.equal(file.suggestedFilename(), "vitalis-base-forecast.csv");
  await file.saveAs("artifacts/vitalis-revenue/forecast.csv");
  assert.equal(
    (await readFile("artifacts/vitalis-revenue/forecast.csv", "utf8")).split(
      "\n",
    ).length,
    13,
  );
  for (const width of [320, 390, 884, 1440]) {
    await op.setViewportSize({ width, height: 950 });
    assert.equal(
      await op.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      "owner overflow " + width,
    );
    await op.screenshot({
      path: `artifacts/vitalis-revenue/owner-${width}.png`,
      fullPage: true,
    });
  }
  await op.getByRole("button", { name: "Conservative", exact: true }).click();
  await op
    .getByText("Research preset · not yet saved", { exact: false })
    .waitFor();
  const forbidden = await staff.newPage();
  await forbidden.goto(base + "/studio/vitalis/revenue");
  await forbidden
    .getByRole("heading", { name: "Owner access required." })
    .waitFor();
  assert.equal(
    await forbidden.getByRole("heading", { name: "Your assumptions." }).count(),
    0,
  );
  await op.route("**/api/studio/vitalis/revenue", (r) =>
    r.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Unavailable" }),
    }),
  );
  await op
    .getByRole("button", { name: "Save planning scenario", exact: true })
    .click();
  await op.getByRole("status").filter({ hasText: "Unavailable" }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: proposed membership at five widths; owner financial controls, persistence, stale/origin/input/role guards, invalid mix, medication simulation, CSV download, server-failure state and four founder widths; no browser exceptions. No payment or clinical calls.",
  );
} finally {
  await writeFile("artifacts/vitalis-revenue/server.log", log);
  await browser?.close();
  server.kill("SIGTERM");
}
