import { chromium } from "@playwright/test";
import { PGlite } from "@electric-sql/pglite";
import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
if (process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)
  throw Error("Local synthetic verification only");
await mkdir("artifacts/vitalis-pilot", { recursive: true });
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
  "DELETE FROM reserve_vitalis_launch_reviews WHERE updated_by='preview-neil'",
);
await pg.query("DELETE FROM reserve_vitalis_rate WHERE user_id='preview-neil'");
await pg.query(
  "DELETE FROM reserve_vitalis_journeys WHERE user_id IN ('preview-client','preview-other')",
);
await pg.query(
  "DELETE FROM reserve_vitalis_rate WHERE user_id IN ('preview-client','preview-other')",
);
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
    client = await browser.newContext(),
    other = await browser.newContext(),
    owner = await browser.newContext(),
    staff = await browser.newContext(),
    errors = [];
  const post = (ctx, path, data, origin = base) =>
    ctx.request.post(base + path, { headers: { Origin: origin }, data });
  for (const [ctx, identity] of [
    [client, "preview-client"],
    [other, "preview-other"],
    [owner, "preview-neil"],
    [staff, "preview-katie"],
  ])
    assert.equal(
      (await post(ctx, "/api/auth", { action: "preview", identity })).status(),
      200,
    );
  assert.equal(
    (await guest.request.get(base + "/api/vitalis/journey")).status(),
    401,
  );
  for (const ctx of [owner, staff])
    assert.equal(
      (await ctx.request.get(base + "/api/vitalis/journey")).status(),
      403,
    );
  for (const ctx of [client, staff, guest])
    assert.equal(
      (await ctx.request.get(base + "/api/studio/vitalis/launch")).status(),
      ctx === guest ? 401 : 403,
    );
  const gp = await guest.newPage();
  await gp.goto(base + "/vitalis/journey");
  await gp.getByRole("link", { name: "Sign in to continue ↗" }).waitFor();
  assert.equal(
    await gp.getByRole("button", { name: "Save my rhythm" }).count(),
    0,
  );
  const cp = await client.newPage();
  cp.on("pageerror", (e) => errors.push(e.message));
  await cp.setViewportSize({ width: 390, height: 950 });
  await cp.goto(base + "/vitalis/journey");
  await cp
    .getByRole("heading", { name: "Choose one useful direction." })
    .waitFor();
  assert.equal(
    await cp.getByRole("button", { name: "Save my rhythm" }).isDisabled(),
    true,
  );
  await cp.getByLabel("Direction", { exact: true }).selectOption("movement");
  await cp.getByLabel("Planning window").selectOption("20");
  await cp.getByLabel("Days per week").selectOption("5");
  await cp.getByLabel("I confirm I am 18 or older.").check();
  await cp
    .getByLabel(
      "I agree to save these choices and completion dates under the pilot privacy notice below.",
    )
    .check();
  const saved = cp.waitForResponse(
    (r) =>
      r.url().endsWith("/api/vitalis/journey") &&
      r.request().method() === "POST",
  );
  await cp.getByRole("button", { name: "Save my rhythm" }).click();
  assert.equal((await saved).status(), 200);
  await cp.getByRole("heading", { name: "Make room to move." }).waitFor();
  await cp.getByRole("button", { name: "Mark today complete" }).click();
  await cp.getByRole("button", { name: "Undo today’s mark" }).waitFor();
  let view = await (
    await client.request.get(base + "/api/vitalis/journey")
  ).json();
  assert.deepEqual(view.journey.days, [view.today]);
  assert.equal(view.journey.target, 5);
  assert.equal(view.journey.minutes, 20);
  const stale = view.journey.revision;
  await cp.reload();
  await cp.getByRole("button", { name: "Undo today’s mark" }).waitFor();
  await cp.getByRole("button", { name: "Undo today’s mark" }).click();
  await cp.getByRole("button", { name: "Mark today complete" }).waitFor();
  assert.equal(
    (
      await client.request.patch(base + "/api/vitalis/journey", {
        headers: { Origin: base },
        data: { revision: stale, completed: true },
      })
    ).status(),
    409,
  );
  assert.equal(
    (
      await client.request.patch(base + "/api/vitalis/journey", {
        headers: { Origin: "https://wrong.invalid" },
        data: { revision: 1, completed: true },
      })
    ).status(),
    403,
  );
  assert.equal(
    (await (await other.request.get(base + "/api/vitalis/journey")).json())
      .journey,
    null,
  );
  assert.equal(
    (
      await client.request.patch(base + "/api/vitalis/journey", {
        headers: { Origin: base },
        data: { revision: 1, completed: true, date: "2030-01-01" },
      })
    ).status(),
    400,
  );
  for (const width of [320, 360, 390, 884, 1440]) {
    await cp.setViewportSize({ width, height: 950 });
    assert.equal(
      await cp.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      "member overflow " + width,
    );
    await cp.screenshot({
      path: `artifacts/vitalis-pilot/member-${width}.png`,
      fullPage: true,
    });
  }
  const op = await owner.newPage();
  op.on("pageerror", (e) => errors.push(e.message));
  await op.goto(base + "/studio/vitalis/launch");
  await op.getByRole("heading", { name: "Launch readiness." }).waitFor();
  await op.getByRole("heading", { name: "1 active rhythms" }).waitFor();
  await op
    .locator("summary")
    .filter({ hasText: "One viable launch offer" })
    .click();
  await op
    .getByLabel("One viable launch offer evidence reference")
    .fill("docs/approved-offer.md");
  await op
    .getByLabel("I reviewed the supporting evidence for this item.")
    .first()
    .check();
  const review = op.waitForResponse(
    (r) =>
      r.url().endsWith("/api/studio/vitalis/launch") &&
      r.request().method() === "POST",
  );
  await op
    .getByRole("button", { name: "Record review", exact: true })
    .first()
    .click();
  assert.equal((await review).status(), 200);
  await op
    .getByRole("status")
    .filter({ hasText: "Review recorded." })
    .waitFor();
  await op.reload();
  await op
    .locator("summary")
    .filter({ hasText: "One viable launch offer" })
    .click();
  assert.equal(
    await op
      .getByLabel("One viable launch offer evidence reference")
      .inputValue(),
    "docs/approved-offer.md",
  );
  assert.equal(
    await op
      .getByLabel("I reviewed the supporting evidence for this item.")
      .first()
      .isChecked(),
    true,
  );
  let launch = await (
    await owner.request.get(base + "/api/studio/vitalis/launch")
  ).json();
  assert.equal(launch.boundary.canCharge, false);
  assert.equal(JSON.stringify(launch).includes("preview-client"), false);
  assert.equal(JSON.stringify(launch).includes("movement"), false);
  assert.equal(
    (
      await post(owner, "/api/studio/vitalis/launch", {
        key: "offer",
        reviewed: true,
        reference: "docs/approved-offer.md",
        revision: 0,
      })
    ).status(),
    409,
  );
  assert.equal(
    (
      await post(owner, "/api/studio/vitalis/launch", {
        key: "partner",
        reviewed: true,
        reference: "",
        revision: 0,
      })
    ).status(),
    400,
  );
  assert.equal(
    (
      await post(owner, "/api/studio/vitalis/launch", {
        key: "partner",
        reviewed: true,
        reference: "https://example.org?token=x",
        revision: 0,
      })
    ).status(),
    400,
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
      path: `artifacts/vitalis-pilot/owner-${width}.png`,
      fullPage: true,
    });
  }
  const sp = await staff.newPage();
  await sp.goto(base + "/studio/vitalis/launch");
  await sp.getByRole("heading", { name: "Owner access required." }).waitFor();
  assert.equal(await sp.getByText("1 active rhythms").count(), 0);
  await cp.setViewportSize({ width: 390, height: 950 });
  await cp
    .getByRole("button", { name: "Clear rhythm and history", exact: true })
    .click();
  await cp.getByRole("button", { name: "Confirm clear", exact: true }).click();
  await cp
    .getByRole("heading", { name: "Choose one useful direction." })
    .waitFor();
  view = await (await client.request.get(base + "/api/vitalis/journey")).json();
  assert.equal(view.journey.active, false);
  assert.deepEqual(view.journey.days, []);
  assert.equal(view.journey.direction, null);
  await cp.route("**/api/vitalis/journey", (r) =>
    r.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Unavailable" }),
    }),
  );
  await cp.getByRole("button", { name: "Reload saved rhythm" }).click();
  await cp.getByRole("status").filter({ hasText: "Unavailable" }).waitFor();
  await cp
    .getByRole("heading", { name: "Choose one useful direction." })
    .waitFor();
  await op.route("**/api/studio/vitalis/launch", (r) =>
    r.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Unavailable" }),
    }),
  );
  await op
    .getByLabel("One viable launch offer evidence reference")
    .fill("docs/draft-offer.md");
  await op
    .getByRole("button", { name: "Record review", exact: true })
    .first()
    .click();
  await op.getByRole("status").filter({ hasText: "Unavailable" }).waitFor();
  assert.equal(
    await op
      .getByLabel("One viable launch offer evidence reference")
      .inputValue(),
    "docs/draft-offer.md",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: private pilot onboarding, saved rhythm, server-day mark/undo, reload, clearing, origin/stale/input/account guards; launch evidence persistence and inactive commerce; five member/four owner widths; failure states; no browser exceptions.",
  );
} finally {
  await writeFile("artifacts/vitalis-pilot/server.log", log);
  await browser?.close();
  server.kill("SIGTERM");
}
