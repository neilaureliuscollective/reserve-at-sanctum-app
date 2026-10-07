import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
const base = "http://localhost:3000";
if (process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)
  throw Error("Membership verification is isolated local preview only.");
// Reset only synthetic membership state before starting Next/PGlite.
const reset = spawn(
  process.execPath,
  ["--import", "tsx", "scripts/reset-membership-verification.ts"],
  { stdio: "inherit" },
);
await new Promise((resolve, reject) => {
  reset.on("exit", (c) =>
    c === 0 ? resolve() : reject(Error("local reset failed")),
  );
});
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
    env: { ...process.env, RESERVE_DEV_PREVIEW: "true", APP_ORIGIN: base },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let serverLog = "";
server.stdout.on("data", (d) => (serverLog += d));
server.stderr.on("data", (d) => (serverLog += d));
await new Promise((resolve, reject) => {
  server.stdout.on("data", (d) => {
    if (String(d).includes("Ready in")) resolve();
  });
  server.on("exit", (c) => reject(Error("server exited " + c)));
  setTimeout(
    () => reject(Error("startup timeout " + serverLog)),
    30000,
  ).unref();
});
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
await mkdir("artifacts/membership-operations", { recursive: true });
const errors = [];
try {
  const client = await browser.newContext(),
    owner = await browser.newContext(),
    staff = await browser.newContext(),
    other = await browser.newContext();
  const page = await client.newPage(),
    office = await owner.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  office.on("pageerror", (e) => errors.push(e.message));
  const login = async (c, identity) => {
    assert.ok(
      (
        await c.request.post(base + "/api/auth", {
          headers: { Origin: base },
          data: { action: "preview", identity },
        })
      ).ok(),
    );
  };
  const api = async (c, action, data) =>
    c.request.post(base + "/api/studio/memberships", {
      headers: { Origin: base },
      data: { action, data },
    });
  assert.equal(
    (
      await client.request.post(base + "/api/membership", {
        headers: { Origin: base },
        data: { interest: "products" },
      })
    ).status(),
    401,
  );
  const anon = await client.request.get(base + "/api/membership");
  assert.equal((await anon.json()).plans.length, 0);
  assert.match(anon.headers()["cache-control"], /no-store/);
  await login(client, "preview-client");
  await login(owner, "preview-neil");
  await login(staff, "preview-katie");
  await login(other, "preview-other");
  for (const c of [client, staff, other])
    assert.equal(
      (await c.request.get(base + "/api/studio/memberships")).status(),
      403,
    );
  assert.equal(
    (
      await owner.request.post(base + "/api/studio/memberships", {
        headers: { Origin: "https://wrong.invalid" },
        data: { action: "grant", data: {} },
      })
    ).status(),
    403,
  );
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(base + "/membership");
  await page
    .getByRole("button", { name: "Request membership access", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Your request is with the house." })
    .waitFor();
  await page
    .getByRole("button", { name: "Withdraw request", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Request membership access", exact: true })
    .waitFor();
  await page.getByLabel("What interests you most?").selectOption("products");
  await page
    .getByRole("button", { name: "Request membership access", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Your request is with the house." })
    .waitFor();
  assert.equal(
    (await (await other.request.get(base + "/api/membership")).json()).request,
    null,
  );
  await office.goto(base + "/studio/memberships");
  await office
    .getByRole("heading", { name: "Membership operations.", exact: true })
    .waitFor();
  for (const width of [320, 390, 884, 1440]) {
    await office.setViewportSize({ width, height: 950 });
    await office.waitForLoadState("networkidle");
    assert.equal(
      await office.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
      "office overflow " + width,
    );
    await office.screenshot({
      path: `artifacts/membership-operations/office-${width}.png`,
      fullPage: true,
    });
  }
  const editor = office.locator(".membership-plan").first();
  await editor.locator("summary").click();
  await editor.getByLabel("Plan name", { exact: true }).fill("House pilot");
  await editor
    .getByLabel("Purpose", { exact: true })
    .fill("An ongoing relationship with Legacy Reserve.");
  const fields = editor.locator("fieldset");
  await fields
    .nth(0)
    .getByRole("textbox", { name: "Privilege 1 description", exact: true })
    .fill("Your personal Reserve profile");
  await fields
    .nth(0)
    .getByRole("combobox", { name: "Privilege 1 category", exact: true })
    .selectOption("digital_access");
  await fields
    .nth(0)
    .getByRole("combobox", { name: "Privilege 1 availability", exact: true })
    .selectOption("available");
  await fields
    .nth(0)
    .getByRole("combobox", { name: "Privilege 1 destination", exact: true })
    .selectOption("profile");
  await editor
    .getByLabel("Publish this complimentary plan for access requests")
    .check();
  await editor.getByRole("button", { name: "Save plan", exact: true }).click();
  await office
    .getByText("Published · complimentary", { exact: false })
    .first()
    .waitFor();
  let overview = await (
    await owner.request.get(base + "/api/studio/memberships")
  ).json();
  const plan = overview.plans.find((p) => p.id === "house");
  assert.equal(plan.active, true);
  assert.equal(
    (
      await api(owner, "plan", {
        id: plan.id,
        revision: plan.revision - 1,
        name: plan.name,
        tagline: plan.tagline,
        active: true,
        benefit_model: plan.benefit_model,
      })
    ).status(),
    409,
  );
  const grantForm = office
    .locator("form")
    .filter({ has: office.getByLabel("Member account email") });
  await grantForm
    .getByLabel("Member account email")
    .fill("jordan@preview.invalid");
  await grantForm
    .getByLabel("Published plan", { exact: true })
    .selectOption("house");
  const day = (n) =>
    new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  await grantForm.getByLabel("Start date").fill(day(-1));
  await grantForm.getByLabel("End date").fill(day(30));
  await grantForm
    .getByLabel("I approve these privileges and dates", { exact: false })
    .check();
  await grantForm
    .getByRole("button", {
      name: "Grant complimentary membership",
      exact: true,
    })
    .click();
  await office
    .getByRole("button", { name: "Pause access", exact: true })
    .waitFor();
  await page.goto(base + "/membership");
  await page.getByText("Complimentary membership", { exact: true }).waitFor();
  await page
    .getByRole("link", { name: "Open ↗ Your personal Reserve profile" })
    .waitFor();
  assert.equal(
    (await (await other.request.get(base + "/api/membership")).json())
      .membership,
    null,
  );
  for (const width of [320, 390, 884, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForLoadState("networkidle");
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
      "member overflow " + width,
    );
    await page.screenshot({
      path: `artifacts/membership-operations/member-${width}.png`,
      fullPage: true,
    });
  }
  const response = await client.request.get(base + "/api/membership");
  assert.match(response.headers()["cache-control"], /no-store/);
  const membership = (await response.json()).membership;
  await office
    .getByRole("button", { name: "Pause access", exact: true })
    .click();
  await office
    .getByRole("button", { name: "Resume access", exact: true })
    .waitFor();
  await page.reload();
  await page
    .getByText("Requires active membership", { exact: true })
    .first()
    .waitFor();
  assert.equal(
    await page.getByRole("link", { name: /Open ↗ Your personal/ }).count(),
    0,
  );
  assert.equal(
    (
      await api(owner, "change", {
        id: membership.id,
        revision: membership.revision,
        action: "resume",
      })
    ).status(),
    409,
  );
  await office
    .getByRole("button", { name: "Resume access", exact: true })
    .click();
  await office
    .getByRole("button", { name: "Pause access", exact: true })
    .waitFor();
  office.once("dialog", (d) => d.accept());
  await office.getByRole("button", { name: "End access", exact: true }).click();
  await office.getByText("ended · complimentary", { exact: false }).waitFor();
  await page.reload();
  await page.getByText("Your membership is ended.", { exact: true }).waitFor();
  assert.equal(
    await page.getByRole("link", { name: /Open ↗ Your personal/ }).count(),
    0,
  );
  const finished = await (
    await owner.request.get(base + "/api/studio/memberships")
  ).json();
  assert.equal(finished.requests[0].status, "fulfilled");
  assert.ok(finished.events.some((e) => e.event === "membership.end"));
  const staffPage = await staff.newPage();
  await staffPage.goto(base + "/studio/memberships");
  await staffPage
    .getByRole("heading", { name: "Owner access required." })
    .waitFor();
  assert.equal(await staffPage.getByLabel("Member account email").count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: request/withdraw/resubmit; owner publication and grant; snapshot availability; pause/resume/end; stale revision and role/origin protections; 320/390/884/1440 layouts; no browser errors.",
  );
} finally {
  await writeFile("/tmp/lr-membership-verification-server.log", serverLog);
  await browser.close();
  server.kill("SIGTERM");
}
