import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { DateTime } from "luxon";
import assert from "node:assert/strict";
if (
  process.env.DATABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NODE_ENV === "production"
)
  throw Error("Isolated synthetic preview only.");
await mkdir("artifacts/fix-it-booking", { recursive: true });
const origin = "http://localhost:3000",
  base = "/fix-it-shop/app";
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
  browser,
  page;
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
  });
  page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const visit = async (path) => {
    await page.goto(origin + path);
    await page.waitForLoadState("networkidle");
  };
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
  const master = await (
    await context.request.get(origin + "/manifest.webmanifest")
  ).json();
  assert.equal(master.id, "/");
  assert.equal(master.name, "Fix It Shop");
  await visit(base);
  assert.equal(await page.locator(".reserve-app-shell").count(), 0);
  assert.equal(await page.locator('link[rel="manifest"]').count(), 1);
  assert.equal(
    await page.locator('link[rel="manifest"]').getAttribute("href"),
    "/fix-it-shop/booking.webmanifest",
  );
  const cdp = await context.newCDPSession(page),
    manifest = await cdp.send("Page.getAppManifest");
  assert.deepEqual(manifest.errors, []);
  assert.equal(JSON.parse(manifest.data).id, base);
  const apple = await page
    .locator('link[rel="apple-touch-icon"]')
    .evaluateAll((links) => links.map((l) => l.getAttribute("href")));
  assert.ok(
    apple.length && apple.every((h) => h.includes("/fix-it-shop/")),
    JSON.stringify(apple),
  );
  for (const size of [180, 192, 512])
    assert.equal(
      (
        await context.request.get(origin + base + "/icons/" + size + ".png")
      ).status(),
      200,
    );
  for (const width of [320, 390, 540, 768, 884, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "home overflow " + width,
    );
    await page.screenshot({
      path: "artifacts/fix-it-booking/home-" + width + ".png",
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await visit(base + "/appointments");
  await page.waitForURL("**/fix-it-shop/app/signin?**");
  assert.equal(await page.locator(".reserve-app-shell").count(), 0);
  await page.getByRole("button", { name: /Experience a client visit/ }).click();
  await page.waitForURL("**/fix-it-shop/app/appointments");
  let day = DateTime.now()
    .setZone("America/Chicago")
    .startOf("day")
    .plus({ days: 29 });
  while (![2, 3, 4, 5, 6].includes(day.weekday)) day = day.plus({ days: 1 });
  const available = await (
    await context.request.get(
      origin +
        "/api/availability?service=signature&location=eunice&date=" +
        day.toISODate(),
    )
  ).json();
  assert.ok(available.slots.length);
  const params = new URLSearchParams({
    provider: "wrong-provider",
    location: "eunice",
    service: "signature",
    date: day.toISODate(),
    start: available.slots[0].start,
  });
  await context.request.post(origin + "/api/auth", {
    headers: { Origin: origin },
    data: { action: "signout" },
  });
  await visit(base + "/book?" + params);
  const signin = await page
    .getByRole("link", { name: /Continue to sign in/ })
    .getAttribute("href");
  assert.ok(signin.startsWith(base + "/signin?"));
  assert.ok(decodeURIComponent(signin).includes("provider=katie"));
  await page.getByRole("link", { name: /Continue to sign in/ }).click();
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /Experience a client visit/ }).click();
  await page.waitForURL("**/fix-it-shop/app/book?**");
  await page.waitForLoadState("networkidle");
  await page
    .getByRole("button", { name: "Reserve preview visit", exact: true })
    .click();
  await page.getByText(/Your test appointment is saved/).waitFor();
  const ics = await page
      .getByRole("link", { name: "Save to calendar" })
      .getAttribute("href"),
    id = ics.split("/").at(-2);
  assert.equal((await context.request.get(origin + ics)).status(), 200);
  await visit(base);
  await page
    .getByRole("heading", { name: "Your next visit.", exact: true })
    .waitFor();
  assert.equal(
    await page.locator('.fix-it-nav [aria-current="page"]').innerText(),
    "Home",
  );
  await page.getByRole("link", { name: /Manage this visit/ }).click();
  await page.waitForLoadState("networkidle");
  await visit(base + "/book");
  await page
    .getByRole("link", { name: /My visits/ })
    .first()
    .click();
  await page.waitForLoadState("networkidle");
  const ref = id.slice(0, 8).toUpperCase();
  let card = page.locator(".appointment").filter({ hasText: ref });
  await card.waitFor();
  await page.reload();
  await page.waitForLoadState("networkidle");
  card = page.locator(".appointment").filter({ hasText: ref });
  await card.waitFor();
  const clientRows = await (
    await context.request.get(origin + "/api/appointments")
  ).json();
  assert.ok(clientRows.visits.some((v) => v.id === id));
  await card.getByRole("button", { name: "Reschedule", exact: true }).click();
  const edit = card.locator(".appointment-edit");
  let next = day.plus({ days: 1 });
  while (![2, 3, 4, 5, 6].includes(next.weekday)) next = next.plus({ days: 1 });
  await edit.getByLabel("Date", { exact: true }).fill(next.toISODate());
  await edit.locator(".time-grid button").first().click();
  await edit
    .getByRole("button", { name: "Confirm new time", exact: true })
    .click();
  await page
    .getByText("Your visit has been rescheduled.", { exact: true })
    .waitFor();
  for (const width of [320, 390, 540, 884, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "visits overflow " + width,
    );
    await page.screenshot({
      path: "artifacts/fix-it-booking/visits-" + width + ".png",
      fullPage: true,
    });
  }
  const rebook = await card
    .getByRole("link", { name: /Book again/ })
    .getAttribute("href");
  assert.ok(rebook.startsWith(base + "/book?"));
  await login("preview-katie");
  const staffRows = await (
    await context.request.get(
      origin + "/api/appointments?studio=true&date=" + next.toISODate(),
    )
  ).json();
  assert.ok(staffRows.visits.some((v) => v.id === id));
  await login("preview-other");
  assert.ok(
    !(
      await (
        await context.request.get(origin + "/api/appointments?provider=katie")
      ).json()
    ).visits.some((v) => v.id === id),
  );
  assert.equal((await context.request.get(origin + ics)).status(), 404);
  await login("preview-client");
  await visit(base + "/appointments");
  card = page.locator(".appointment").filter({ hasText: ref });
  await card.getByRole("button", { name: "Cancel visit", exact: true }).click();
  await card
    .getByRole("button", { name: "Confirm cancellation", exact: true })
    .click();
  await page
    .getByText("Your visit has been cancelled.", { exact: true })
    .waitFor();
  await visit(base + "/install");
  assert.equal(
    await page
      .getByRole("button", { name: "Install Fix It Shop", exact: true })
      .count(),
    0,
  );
  await page
    .getByRole("heading", { name: "If Legacy Reserve is already installed" })
    .waitFor();
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt");
    Object.assign(event, {
      prompt: async () => {},
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    });
    window.dispatchEvent(event);
  });
  await page
    .getByRole("button", { name: "Install Fix It Shop", exact: true })
    .click();
  await page
    .getByText("You can use Fix It Shop in this browser or install later.", {
      exact: true,
    })
    .waitFor();
  await visit(base + "/signin?next=%2F%2Fevil.invalid");
  const badTarget = await page
    .getByRole("button", { name: /Experience a client visit/ })
    .getAttribute("type");
  await page.getByRole("button", { name: /Experience a client visit/ }).click();
  await page.waitForURL("**/fix-it-shop/app/appointments");
  await visit(
    "/auth/callback?next=" + encodeURIComponent(base + "/appointments"),
  );
  await page.waitForURL("**/fix-it-shop/app/signin?**");
  await page.getByText(/That sign-in did not finish/).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS Fix It Shop: separate manifest/icons and shell, six mobile widths, provider-fixed booking with sign-in return, shared persistence and staff calendar, rebooking/reschedule/cancel, ownership denial and honest install fallback.",
  );
} catch (e) {
  await writeFile("artifacts/fix-it-booking/server.log", logs);
  await page?.screenshot({
    path: "artifacts/fix-it-booking/failure.png",
    fullPage: true,
  });
  throw e;
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
