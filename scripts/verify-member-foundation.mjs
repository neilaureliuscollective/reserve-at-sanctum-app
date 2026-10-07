import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { DateTime } from "luxon";
import { spawn } from "node:child_process";
const base = process.env.APP_ORIGIN || "http://localhost:3000";
if (!base.includes("localhost"))
  throw Error("Synthetic member verification is local only");
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
await mkdir("artifacts/member-foundation", { recursive: true });
const errors = [];
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(25000);
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [320, 360, 390, 884, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/home",
      "/membership",
      "/my-reserve",
      "/profile",
      "/book",
      "/shop",
    ]) {
      const response = await page.goto(base + path);
      assert.ok(response.ok(), path);
      await page.locator("main h1:visible").waitFor();
      await page.waitForLoadState("networkidle");
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
        `${path} overflow ${width}`,
      );
      assert.equal(await page.locator("main h1:visible").count(), 1, path);
      if (path === "/home" || path === "/membership")
        await page.screenshot({
          path: `artifacts/member-foundation/${path.slice(1)}-${width}.png`,
          fullPage: true,
        });
    }
  }
  assert.equal(
    (
      await context.request.post(base + "/api/location-preference", {
        headers: { Origin: base },
        data: { locationId: "eunice" },
      })
    ).status(),
    401,
  );
  await context.request.post(base + "/api/auth", {
    headers: { Origin: base },
    data: { action: "preview", identity: "preview-client" },
  });
  await page.goto(base + "/home");
  await page.getByRole("heading", { name: "Welcome back, Jordan." }).waitFor();
  await page
    .getByRole("navigation", { name: "Legacy Reserve navigation" })
    .getByRole("link", { name: "Membership", exact: true })
    .click();
  await page.getByRole("heading", { name: "Belong with purpose." }).waitFor();
  assert.equal(
    await page.getByRole("button", { name: /join|subscribe|pay/i }).count(),
    0,
  );
  await page.goto(base + "/my-reserve");
  await page.getByRole("heading", { name: "Your Reserve, Jordan." }).waitFor();
  await page.getByRole("button", { name: "Save preference" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Preferred house saved." })
    .waitFor();
  await page.screenshot({
    path: "artifacts/member-foundation/my-reserve-client.png",
    fullPage: true,
  });
  const rejected = await context.request.post(
    base + "/api/location-preference",
    { headers: { Origin: base }, data: { locationId: "lafayette" } },
  );
  assert.equal(rejected.status(), 400);
  assert.equal(
    (
      await context.request.post(base + "/api/location-preference", {
        headers: { Origin: "https://wrong.invalid" },
        data: { locationId: "eunice" },
      })
    ).status(),
    403,
  );
  await page.goto(base + "/my-sanctum");
  await page.waitForURL("**/profile");
  // Complete real UI booking in synthetic preview, with server-side location confirmation.
  const menu = (
    await (
      await context.request.get(base + "/api/availability?location=eunice")
    ).json()
  ).services;
  assert.ok(menu[0].provider_name);
  assert.equal(
    (
      await (
        await context.request.get(base + "/api/availability?location=lafayette")
      ).json()
    ).services.length,
    0,
  );
  let date = DateTime.now()
    .setZone("America/Chicago")
    .plus({ days: 8 })
    .startOf("day");
  while (![2, 3, 4, 5, 6].includes(date.weekday)) date = date.plus({ days: 1 });
  await page.goto(base + `/book?location=eunice&date=${date.toISODate()}`);
  await page.getByRole("button", { name: /Signature grooming/ }).click();
  await page.getByRole("button", { name: "Find a time" }).click();
  await page.locator(".time-grid button").first().click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: /Reserve preview visit/ }).click();
  await page.getByRole("heading", { name: /Time set aside/ }).waitFor();
  await page.getByRole("link", { name: /Prepare your visit/ }).click();
  await page
    .getByRole("heading", { name: "Your time is set aside." })
    .waitFor();
  assert.match(
    await page.locator("main").innerText(),
    /Katie · Legacy Reserve — Eunice/,
  );
  await page.goto(base + "/home");
  await page.getByRole("heading", { name: "Signature grooming" }).waitFor();
  await page.setViewportSize({ width: 360, height: 740 });
  await page.screenshot({
    path: "artifacts/member-foundation/home-client-360.png",
    fullPage: true,
  });
  const all = (
    await (await context.request.get(base + "/api/appointments")).json()
  ).visits;
  const a = all.find((v) => v.status === "confirmed");
  assert.equal(a.location_id, "eunice");
  await context.request.patch(base + `/api/appointments/${a.id}`, {
    headers: { Origin: base },
    data: { action: "cancel", revision: a.revision },
  });
  await context.request.post(base + "/api/auth", {
    headers: { Origin: base },
    data: { action: "preview", identity: "preview-katie" },
  });
  await page.goto(base + "/home");
  await page.waitForURL("**/studio");
  await page.locator(".studio-shell").waitFor();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(base + "/home?explore=1");
  await page.locator("main h1:visible").waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: 320/360/390/884/1440 layouts; membership navigation; auth/origin/closed-location guards; preference save; legacy profile redirect; member booking/preparation/cancellation; team redirect; no browser errors.",
  );
} finally {
  await writeFile("/tmp/lr-verification-server.log", serverLog);
  await browser.close();
  server.kill();
}
