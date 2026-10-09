import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { DateTime } from "luxon";
if (process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)
  throw Error("Synthetic local environment only.");
await mkdir("artifacts", { recursive: true });
const origin = "http://localhost:3000";
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
    env: { ...process.env, RESERVE_DEV_PREVIEW: "true", APP_ORIGIN: origin },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let logs = "",
  browser;
server.stdout.on("data", (d) => (logs += d));
server.stderr.on("data", (d) => (logs += d));
try {
  await new Promise((resolve, reject) => {
    server.stdout.on("data", (d) => {
      if (String(d).includes("Ready in")) resolve();
    });
    server.on("exit", (c) => reject(Error("Server exit " + c)));
    setTimeout(() => reject(Error("Startup timeout")), 30000).unref();
  });
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/tmp/chromium",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    page = await context.newPage();
  page.setDefaultTimeout(20000);
  const visit = async (url) => {
    await page.goto(url);
    await page.waitForLoadState("networkidle");
  };
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const login = async (identity) =>
    assert.equal(
      (
        await context.request.post(origin + "/api/auth", {
          headers: { Origin: origin },
          data: { action: "preview", identity },
        })
      ).status(),
      200,
    );
  await login("preview-katie");
  await visit(origin + "/studio");
  await page.waitForURL("**/studio/schedule");
  await visit(origin + "/studio/clients");
  await page.getByText("Add client", { exact: true }).click();
  const form = page.locator("form").first();
  const name = "Pilot " + Date.now();
  await form.getByLabel("Name", { exact: true }).fill(name);
  await form
    .getByLabel("Email", { exact: true })
    .fill("pilot-" + Date.now() + "@example.invalid");
  await form.getByLabel("Phone", { exact: true }).fill("3375550199");
  await form.getByLabel(/I checked existing/).check();
  await form.getByRole("button", { name: "Save client", exact: true }).click();
  await page.getByText("Client saved.", { exact: true }).waitFor();
  await page.getByRole("link", { name: new RegExp(name) }).click();
  await page.getByRole("heading", { name }).waitFor();
  await visit(origin + "/studio/schedule");
  await page
    .getByRole("button", { name: "Add appointment", exact: true })
    .click();
  const booking = page.locator("form").first();
  await booking.getByLabel("Find client", { exact: true }).fill(name);
  await booking
    .locator("select")
    .filter({ has: page.locator("option", { hasText: name }) })
    .selectOption({ label: name });
  await booking
    .locator("select")
    .filter({ has: page.locator("option[value=signature]") })
    .selectOption("signature");
  let day = DateTime.now()
    .setZone("America/Chicago")
    .startOf("day")
    .plus({ days: 32 });
  while (![2, 3, 4, 5, 6].includes(day.weekday)) day = day.plus({ days: 1 });
  await booking.getByLabel("Date", { exact: true }).fill(day.toISODate());
  const time = booking.getByLabel(/Available time/);
  await time.locator("option").nth(1).waitFor({ state: "attached" });
  const first = await time.locator("option").nth(1).getAttribute("value");
  await time.selectOption(first);
  await booking.getByLabel("Service note").fill("Keep the finish natural.");
  await booking
    .getByRole("button", { name: "Save appointment", exact: true })
    .click();
  await page.getByText(/Appointment saved. Reference/).waitFor();
  await page
    .locator(".calendar-filter")
    .getByLabel("Choose a day")
    .fill(day.toISODate());
  await page.locator(".appointment").filter({ hasText: name }).waitFor();
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page
    .locator(".calendar-filter")
    .getByLabel("Choose a day")
    .fill(day.toISODate());
  const card = page.locator(".appointment").filter({ hasText: name });
  await card.waitFor();
  assert.ok((await card.textContent()).includes("Keep the finish natural."));
  const calendar = await card
    .getByRole("link", { name: "Save to calendar" })
    .getAttribute("href");
  const ics = await context.request.get(origin + calendar);
  assert.equal(ics.status(), 200);
  assert.match(await ics.text(), /BEGIN:VEVENT/);
  assert.ok(!(await ics.text()).includes("Keep the finish natural"));
  await card.getByRole("button", { name: "Reschedule", exact: true }).click();
  const edit = card.locator(".appointment-edit");
  const dateInput = edit.locator('input[type="date"]');
  let next = day.plus({ days: 1 });
  while (![2, 3, 4, 5, 6].includes(next.weekday)) next = next.plus({ days: 1 });
  await dateInput.fill(next.toISODate());
  const timeButton = edit.locator(".time-grid button").first();
  await timeButton.waitFor();
  await timeButton.click();
  await edit
    .getByRole("button", { name: /Save|Confirm|Reschedule/ })
    .last()
    .click();
  await page
    .getByText("Your visit has been rescheduled.", { exact: true })
    .waitFor();
  await page
    .locator(".calendar-filter")
    .getByLabel("Choose a day")
    .fill(next.toISODate());
  await page.locator(".appointment").filter({ hasText: name }).waitFor();
  for (const width of [320, 390, 540, 884, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({
      path: "artifacts/booking-pilot-" + width + ".png",
      fullPage: true,
    });
    const overflow = await page.evaluate(() =>
      [...document.querySelectorAll("body *")]
        .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
        .map((e) => ({
          tag: e.tagName,
          cls: e.className,
          width: e.getBoundingClientRect().width,
          text: e.textContent?.slice(0, 70),
        }))
        .slice(-20),
    );
    if (overflow.length) console.log(JSON.stringify(overflow));
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "overflow " + width,
    );
    await page.screenshot({
      path: "artifacts/booking-pilot-" + width + ".png",
      fullPage: true,
    });
  }
  const stored = (
    await (
      await context.request.get(
        origin + "/api/appointments?studio=true&date=" + next.toISODate(),
      )
    ).json()
  ).visits.find((v) => v.client_name === name);
  assert.ok(stored);
  await login("preview-client");
  assert.equal(
    (
      await context.request.get(
        origin + "/api/studio/pilot/clients?provider=katie",
      )
    ).status(),
    403,
  );
  assert.equal((await context.request.get(origin + calendar)).status(), 404);
  await login("preview-katie");
  const cancel = await context.request.patch(
    origin + "/api/appointments/" + stored.id,
    {
      headers: { Origin: origin },
      data: { action: "cancel", revision: stored.revision },
    },
  );
  assert.equal(cancel.status(), 200);
  const after = (
    await (
      await context.request.get(
        origin + "/api/appointments?studio=true&date=" + next.toISODate(),
      )
    ).json()
  ).visits.find((v) => v.id === stored.id);
  assert.equal(after.status, "cancelled");
  const messages = await (
    await context.request.get(origin + "/api/studio/pilot/messages")
  ).json();
  assert.ok(
    messages.messages.some(
      (m) => m.appointment_id === stored.id && m.kind === "cancel",
    ),
  );
  await visit(origin + "/studio/clients");
  await page.getByText("Import pilot clients", { exact: true }).click();
  await page.getByLabel("Source system").fill("pilot-browser-" + Date.now());
  await page
    .getByLabel("CSV contents")
    .fill(
      "name,email,phone,source_key\nCSV Pilot,csv-" +
        Date.now() +
        "@example.invalid,,row-1",
    );
  await page.getByRole("button", { name: "Preview import" }).click();
  await page.getByText("CSV Pilot — Ready", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Import reviewed contacts" }).click();
  await page
    .getByText("1 clients added; 0 already imported.", { exact: true })
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS booking pilot: client entry/history, staff launch, manual booking/reload/reschedule/cancel, ICS privacy, client denial, CSV preview/import, five widths and no page errors.",
  );
} catch (e) {
  await writeFile("artifacts/booking-pilot-server.log", logs);
  throw e;
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
