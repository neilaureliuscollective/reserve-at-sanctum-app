import { waitForApplication } from "./wait-for-application.mjs";
import { assertSyntheticVerification } from "./synthetic-verification.mjs";
import { chromium } from "@playwright/test";
import { spawn, execFileSync } from "node:child_process";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { DateTime } from "luxon";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
assertSyntheticVerification();
const origin = "http://localhost:3000",
  dir = "artifacts/katie-workspace";
await mkdir(dir, { recursive: true });
function fixture(sql) {
  execFileSync(process.execPath, [
    "--import",
    "tsx",
    "--input-type=module",
    "-e",
    `import {PGlite} from '@electric-sql/pglite';import {schema,seed,wrapPglite} from './lib/db.ts';const pg=new PGlite('.data/reserve');await pg.waitReady;const db=wrapPglite(pg);await schema(db);await seed(db);await db.query(${JSON.stringify(sql)});await pg.close();`,
  ]);
}
// Multi-statement input is not used by the parameterized query adapter.
for (const sql of [
  "INSERT INTO reserve_businesses(id,slug,display_name,created_by) VALUES('synthetic-workspace','fix-it-shop','Synthetic Fix It Shop','preview-neil') ON CONFLICT DO NOTHING",
  "INSERT INTO reserve_business_memberships(business_id,user_id,role,verified_at,verified_by) VALUES('synthetic-workspace','preview-katie','business_owner',now(),'preview-neil') ON CONFLICT(business_id,user_id) DO UPDATE SET revoked_at=NULL",
  "INSERT INTO reserve_business_providers(business_id,provider_id) VALUES('synthetic-workspace','katie') ON CONFLICT DO NOTHING",
  "INSERT INTO reserve_business_locations(business_id,location_id) VALUES('synthetic-workspace','eunice') ON CONFLICT DO NOTHING",
  "INSERT INTO reserve_business_provider_locations(business_id,provider_id,location_id) VALUES('synthetic-workspace','katie','eunice') ON CONFLICT DO NOTHING",
])
  fixture(sql);
let logs = "",
  browser,
  server;
const checks = [];
const revocationToken = randomUUID();
const fixtureRoute = "app/api/synthetic-live-revocation";
async function start() {
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1"],
    {
      env: {
        ...process.env,
        SYNTHETIC_REVOCATION_TOKEN: revocationToken,
        RESERVE_DEV_PREVIEW: "true",
        RESERVE_BUSINESS_AUTHORITY_ENABLED: "true",
        APP_ORIGIN: origin,
        RESERVE_BOOKING_EMAIL_ENABLED: "false",
        RESERVE_BOOKING_CRON_ENABLED: "false",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout.on("data", (d) => (logs += d));
  server.stderr.on("data", (d) => (logs += d));
  await new Promise((resolve, reject) => {
    server.stdout.on("data", (d) => {
      if (String(d).includes("Ready in")) resolve();
    });
    server.on("exit", () => reject(Error("Server stopped")));
    setTimeout(() => reject(Error("Startup timeout")), 45000).unref();
  });
}
async function stop() {
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await new Promise((resolve) => server.once("exit", resolve));
  }
}
try {
  await mkdir(fixtureRoute);
  await writeFile(fixtureRoute + "/route.ts", await readFile("scripts/fixtures/live-revocation-route.txt"));
  await start();
  await waitForApplication(origin);
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const client = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    owner = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const api = (context, path, method = "GET", data) =>
    context.request.fetch(origin + path, {
      method,
      headers: { Origin: origin },
      ...(data ? { data } : {}),
    });
  const login = async (c, id) =>
    assert.equal(
      (
        await api(c, "/api/auth", "POST", { action: "preview", identity: id })
      ).status(),
      200,
    );
  await login(client, "preview-client");
  await login(owner, "preview-katie");
  assert.equal(
    (await api(client, "/api/fix-it-management?date=2026-10-15")).status(),
    403,
  );
  const page = await owner.newPage();
  page.setDefaultTimeout(25000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(origin + "/enter");
  await page.waitForURL("**/fix-it-shop/manage");
  await page.getByText("No native appointments on this day.").waitFor();
  await page.getByText("Add approved service · katie", { exact: true }).click();
  const form = page
    .locator("details")
    .filter({
      has: page.getByText("Add approved service · katie", { exact: true }),
    });
  await form
    .getByLabel("Service name", { exact: true })
    .fill("Synthetic owner configured service");
  await form
    .getByLabel("Description", { exact: true })
    .fill("Synthetic fixture, no approved real pricing");
  await form.getByLabel("Duration in minutes").fill("25");
  await form.getByLabel("Buffer in minutes").fill("5");
  await form.getByLabel("Price in cents").fill("3200");
  await form.getByLabel("Publish approved service").check();
  await form.getByRole("button", { name: "Save service" }).focus();
  await page.keyboard.press("Enter");
  await page
    .getByText("Saved. Your calendar and settings are refreshed.")
    .waitFor();
  const menu = await (await api(client, "/api/availability")).json();
  const service = menu.services.find(
    (s) => s.name === "Synthetic owner configured service",
  );
  assert.ok(service);
  let day = DateTime.now().setZone("America/Chicago").plus({ days: 20 }),
    slots = [];
  for (let i = 0; i < 15; i++, day = day.plus({ days: 1 })) {
    slots =
      (
        await (
          await api(
            client,
            `/api/availability?service=${service.id}&date=${day.toISODate()}`,
          )
        ).json()
      ).slots || [];
    if (slots.length) break;
  }
  assert.ok(slots.length);
  const booked = await api(client, "/api/appointments", "POST", {
    actorId: "preview-client",
    serviceId: service.id,
    start: slots[0].start,
    note: "Synthetic private note excluded from management",
    requestKey: randomUUID(),
    locationId: "eunice",
  });
  assert.equal(booked.status(), 201, await booked.text());
  const result = await booked.json();
  const appointment = result.appointment;
  assert.ok(appointment?.id);
  await page.getByLabel("Calendar day").fill(day.toISODate());
  await page
    .getByRole("heading", {
      name: /Jordan.*Synthetic owner configured service/,
    })
    .first()
    .waitFor();
  await page.reload();
  await page
    .getByRole("heading", {
      name: /Jordan.*Synthetic owner configured service/,
    })
    .first()
    .waitFor();
  const fresh = await browser.newContext({
    storageState: await owner.storageState(),
  });
  const snapshot = await (
    await api(fresh, "/api/fix-it-management?date=" + day.toISODate())
  ).json();
  assert.ok(snapshot.appointments.some((a) => a.id === appointment.id));
  assert.doesNotMatch(
    JSON.stringify(snapshot.appointments),
    /Synthetic private note/,
  );
  assert.equal((await api(owner, "/api/chair/studio")).status(), 403);
  assert.equal((await api(owner, "/api/studio/businesses")).status(), 403);
  const customerPage = await client.newPage();
  await customerPage.goto(origin + "/fix-it-shop/app/appointments");
  await customerPage
    .getByRole("heading", { name: "Synthetic owner configured service" })
    .first()
    .waitFor();
  await customerPage.screenshot({
    path: dir + "/customer-phone.png",
    fullPage: true,
  });
  for (const width of [320, 390, 540, 884, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `Management overflow ${width}`,
    );
    await page.screenshot({
      path: dir + `/management-${width}.png`,
      fullPage: true,
    });
    await page.waitForFunction(() => document.title.includes("Management"));
    if (process.env.AXE_CORE_PATH) {
      await page.addScriptTag({ path: process.env.AXE_CORE_PATH });
      const audit = await page.evaluate(() =>
        window.axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
        }),
      );
      assert.deepEqual(
        audit.violations.map((v) => v.id),
        [],
      );
    }
  }
  checks.push(
    "Keyboard service configuration; customer booking persists; owner calendar and fresh cookie session see identical ID; customer and Founder/Chair boundaries; phone/Fold/desktop layouts",
  );
  assert.equal(
    (
      await api(owner, "/api/fix-it-management", "POST", {
        action: "appointment",
        id: appointment.id,
        revision: appointment.revision,
        change: "reschedule",
        start: slots.at(-1).start,
      })
    ).status(),
    200,
  );
  const changed = (
    await (
      await api(owner, "/api/fix-it-management?date=" + day.toISODate())
    ).json()
  ).appointments.find((a) => a.id === appointment.id);
  assert.equal(
    (
      await api(owner, "/api/fix-it-management", "POST", {
        action: "appointment",
        id: appointment.id,
        revision: changed.revision,
        change: "cancel",
      })
    ).status(),
    200,
  );
  checks.push(
    "Scoped reschedule and cancellation through real management HTTP actions",
  );
  const cookiesBeforeRevocation = await owner.cookies();
  assert.equal((await owner.request.post(origin + "/api/synthetic-live-revocation", {
    headers: {"x-synthetic-token": revocationToken},
  })).status(), 200);
  assert.deepEqual(await owner.cookies(), cookiesBeforeRevocation);
  assert.equal(server.exitCode, null);
  assert.equal(
    (
      await api(owner, "/api/fix-it-management?date=" + day.toISODate())
    ).status(),
    403,
  );
  assert.equal((await api(owner, "/api/studio/day")).status(), 403);
  assert.equal((await api(owner, "/api/fix-it-management", "POST", {
    action: "appointment", id: appointment.id, revision: changed.revision + 1,
    change: "cancel",
  })).status(), 403);
  await page.goto(origin + "/fix-it-shop/manage");
  await page
    .getByRole("heading", { name: "Management access is not ready" })
    .waitFor();
  checks.push(
    "Uninterrupted server and unchanged session denied management and legacy Studio after membership revocation",
  );
  assert.deepEqual(errors, []);
  await writeFile(
    dir + "/results.json",
    JSON.stringify(
      { checks, synthetic: true, mail: "disabled", payments: "disabled" },
      null,
      2,
    ),
  );
  console.log("PASS Katie workspace: " + checks.join("; "));
} finally {
  await browser?.close();
  await stop();
  await rm(fixtureRoute, {recursive: true, force: true});
  await writeFile(dir + "/server.log", logs);
  fixture(
    "DELETE FROM reserve_business_memberships WHERE business_id='synthetic-workspace'",
  );
}
