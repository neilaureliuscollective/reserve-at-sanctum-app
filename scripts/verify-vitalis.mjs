import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, writeFile, readdir, readFile } from "node:fs/promises";
import assert from "node:assert/strict";
if (process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)
  throw Error("Local synthetic verification only");
const { PGlite } = await import("@electric-sql/pglite");
const pg = new PGlite(".data/reserve");
await pg.waitReady;
for (const file of (await readdir("migrations"))
  .filter((n) => /^\d+.*\.sql$/.test(n))
  .sort()) {
  for (const statement of (await readFile("migrations/" + file, "utf8"))
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean))
    await pg.query(statement);
}
await pg.query(
  "DELETE FROM reserve_vitalis_interests WHERE user_id IN ('preview-client','preview-other')",
);
await pg.query(
  "DELETE FROM reserve_vitalis_consent_events WHERE user_id IN ('preview-client','preview-other')",
);
await pg.query("DELETE FROM reserve_vitalis_rate");
await pg.query(
  "DELETE FROM reserve_vitalis_partners WHERE name='Synthetic diagnostics partner'",
);
await pg.query(
  "UPDATE reserve_vitalis_settings SET visible=true,registration_open=true",
);
await pg.close();
const base = "http://127.0.0.1:3100";
const server = spawn(
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
    env: {
      ...process.env,
      RESERVE_DEV_PREVIEW: "true",
      APP_ORIGIN: base,
      RESERVE_CONCIERGE_MODEL: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let log = "",
  browser;
server.stdout.on("data", (d) => (log += d));
server.stderr.on("data", (d) => (log += d));
try {
  await new Promise((resolve, reject) => {
    server.stdout.on("data", (d) => {
      if (String(d).includes("Ready in")) resolve();
    });
    server.on("exit", (c) => reject(Error("Server exited " + c)));
    setTimeout(() => reject(Error("Startup timeout")), 30000).unref();
  });
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  await mkdir("artifacts/vitalis", { recursive: true });
  const guest = await browser.newContext(),
    client = await browser.newContext(),
    other = await browser.newContext(),
    staff = await browser.newContext(),
    owner = await browser.newContext();
  const errors = [];
  const page = await guest.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/vitalis");
  await page
    .getByRole("heading", { name: "Precision for a longer horizon." })
    .waitFor();
  await page.getByRole("link", { name: "Sign in for early access" }).waitFor();
  for (const width of [320, 360, 390, 884, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.screenshot({
      path: `artifacts/vitalis/guest-${width}.png`,
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      "overflow " + width,
    );
  }
  const post = (ctx, path, data, origin = base) =>
    ctx.request.post(base + path, { headers: { Origin: origin }, data });
  const draft = {
    interests: ["diagnostics"],
    region: "LA",
    outreach: false,
    collectionConsent: true,
    noticeVersion: "vitalis-2026-10-08",
    revision: 0,
  };
  assert.equal(
    (await post(guest, "/api/vitalis/interest", draft)).status(),
    401,
  );
  for (const [ctx, identity] of [
    [client, "preview-client"],
    [other, "preview-other"],
    [staff, "preview-katie"],
    [owner, "preview-neil"],
  ])
    assert.equal(
      (await post(ctx, "/api/auth", { action: "preview", identity })).status(),
      200,
    );
  assert.equal(
    (await post(staff, "/api/vitalis/interest", draft)).status(),
    403,
  );
  assert.equal(
    (await staff.request.get(base + "/api/studio/vitalis")).status(),
    403,
  );
  assert.equal(
    (
      await post(
        client,
        "/api/vitalis/interest",
        draft,
        "https://untrusted.invalid",
      )
    ).status(),
    403,
  );
  assert.equal(
    (
      await post(client, "/api/vitalis/interest", {
        ...draft,
        user_id: "preview-other",
      })
    ).status(),
    400,
  );
  const cp = await client.newPage();
  cp.on("pageerror", (e) => errors.push(e.message));
  await cp.setViewportSize({ width: 390, height: 900 });
  await cp.goto(base + "/vitalis");
  await cp
    .getByRole("button", { name: "Join early access", exact: true })
    .waitFor();
  await cp
    .getByRole("checkbox", { name: "Advanced diagnostics", exact: true })
    .check();
  await cp.getByLabel("State or territory").selectOption("LA");
  await cp
    .getByRole("checkbox", {
      name: "I agree to the Vitalis early-access collection notice below.",
    })
    .check();
  const joining = cp.waitForResponse(
    (r) =>
      r.url().endsWith("/api/vitalis/interest") &&
      r.request().method() === "POST",
  );
  await cp
    .getByRole("button", { name: "Join early access", exact: true })
    .click();
  assert.equal((await joining).status(), 200);
  await cp
    .getByRole("status")
    .filter({ hasText: "Your Vitalis early access is saved" })
    .waitFor();
  let row = (
    await (await client.request.get(base + "/api/vitalis/interest")).json()
  ).interest;
  assert.equal(row.revision, 1);
  assert.equal(row.outreach, false);
  assert.deepEqual(row.interests, ["diagnostics"]);
  assert.equal(
    (await (await other.request.get(base + "/api/vitalis/interest")).json())
      .interest,
    null,
  );
  const duplicate = await post(client, "/api/vitalis/interest", {
    ...draft,
    outreach: true,
  });
  assert.equal(duplicate.status(), 200);
  assert.equal((await duplicate.json()).interest.outreach, false);
  await cp
    .getByRole("button", { name: "Save preferences", exact: true })
    .waitFor();

  await cp
    .getByRole("checkbox", { name: "Email me about the Vitalis launch." })
    .check();
  assert.equal(
    await cp
      .getByRole("checkbox", { name: "Email me about the Vitalis launch." })
      .isChecked(),
    true,
  );
  await cp.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  const savingPreferences = cp.waitForResponse(
    (r) =>
      r.url().endsWith("/api/vitalis/interest") &&
      r.request().method() === "PATCH",
  );
  await cp
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  const savedPreferences = await savingPreferences;
  assert.equal(savedPreferences.status(), 200);
  await cp
    .getByRole("status")
    .filter({ hasText: "Your Vitalis early access is saved" })
    .waitFor();
  row = (
    await (await client.request.get(base + "/api/vitalis/interest")).json()
  ).interest;
  assert.equal(row.outreach, true);
  const op = await owner.newPage();
  op.on("pageerror", (e) => errors.push(e.message));
  await op.setViewportSize({ width: 390, height: 950 });
  await op.goto(base + "/studio/vitalis");
  await op.getByRole("heading", { name: "Vitalis operations." }).waitFor();
  await op.getByRole("heading", { name: "Early-access roster" }).waitFor();
  assert.equal(
    await op.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
  );
  await op.screenshot({
    path: "artifacts/vitalis/owner-390.png",
    fullPage: true,
  });
  await op
    .getByRole("button", { name: "Add partner draft", exact: true })
    .click();
  await op.getByLabel("Partner name").fill("Synthetic diagnostics partner");
  await op.getByLabel("Supported states/territories").fill("LA");
  await op
    .getByRole("button", { name: "Save unpublished partner", exact: true })
    .click();
  await op
    .getByRole("heading", { name: "Synthetic diagnostics partner" })
    .waitFor();
  await op.getByRole("button", { name: "Edit partner", exact: true }).click();
  await op.getByLabel("Internal status").selectOption("in-review");
  await op
    .getByRole("button", { name: "Save unpublished partner", exact: true })
    .click();
  await op.getByText("in-review · clinical · Unpublished").waitFor();
  let office = await (
    await owner.request.get(base + "/api/studio/vitalis")
  ).json();
  assert.equal(office.totals.active, 1);
  assert.equal(office.totals.contact_ready, 1);
  await post(owner, "/api/studio/vitalis", {
    action: "settings",
    data: {
      visible: true,
      registration_open: false,
      revision: office.settings.revision,
    },
  });
  await cp.reload();
  await cp
    .getByRole("button", { name: "Remove email permission", exact: true })
    .waitFor();
  await cp
    .getByRole("button", { name: "Remove email permission", exact: true })
    .click();
  await cp
    .getByRole("status")
    .filter({ hasText: "Your Vitalis early access is saved" })
    .waitFor();
  assert.equal(
    (await (await client.request.get(base + "/api/vitalis/interest")).json())
      .interest.outreach,
    false,
  );
  await cp
    .getByRole("button", { name: "Withdraw registration", exact: true })
    .click();
  await cp
    .getByRole("status")
    .filter({ hasText: "Registration withdrawn" })
    .waitFor();
  row = (
    await (await client.request.get(base + "/api/vitalis/interest")).json()
  ).interest;
  assert.deepEqual(row.interests, []);
  assert.equal(row.region, "");
  assert.equal(row.status, "withdrawn");
  office = await (await owner.request.get(base + "/api/studio/vitalis")).json();
  await post(owner, "/api/studio/vitalis", {
    action: "settings",
    data: {
      visible: false,
      registration_open: false,
      revision: office.settings.revision,
    },
  });
  await page.reload();
  await page
    .getByRole("heading", { name: "The next chapter is being prepared." })
    .waitFor();
  office = await (await owner.request.get(base + "/api/studio/vitalis")).json();
  await post(owner, "/api/studio/vitalis", {
    action: "settings",
    data: {
      visible: true,
      registration_open: true,
      revision: office.settings.revision,
    },
  });
  await cp.reload();
  await cp
    .getByRole("checkbox", {
      name: "I agree to the Vitalis early-access collection notice below.",
    })
    .check();
  await cp
    .getByRole("button", { name: "Join early access", exact: true })
    .click();
  await cp
    .getByRole("status")
    .filter({ hasText: "Your Vitalis early access is saved" })
    .waitFor();
  await cp.emulateMedia({ reducedMotion: "reduce" });
  await cp.screenshot({
    path: "artifacts/vitalis/member-390.png",
    fullPage: true,
  });
  const tab = await staff.newPage();
  await tab.goto(base + "/studio/vitalis");
  await tab.getByRole("heading", { name: "Owner access required." }).waitFor();
  assert.equal(await tab.getByText("Early-access roster").count(), 0);
  await page.route("**/api/vitalis/interest", (r) =>
    r.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Unavailable" }),
    }),
  );
  await page.reload();
  await page
    .getByRole("heading", { name: "Registration could not refresh." })
    .waitFor();
  await page
    .getByRole("heading", { name: "Precision for a longer horizon." })
    .waitFor();
  assert.deepEqual(errors, []);
  await writeFile("artifacts/vitalis/server.log", log);
  console.log(
    "Vitalis browser verification passed: 5 widths; guest/client/other/staff/owner isolation; registration, duplicate, update, pause, withdrawal, rejoin, partner edits, visibility and unavailable state.",
  );
} finally {
  await writeFile("artifacts/vitalis/server.log", log);
  await browser?.close();
  server.kill("SIGTERM");
}
