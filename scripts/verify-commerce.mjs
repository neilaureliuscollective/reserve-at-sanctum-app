import { spawn } from "node:child_process";
import { DateTime } from "luxon";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const origin = process.env.VERIFY_ORIGIN || "http://localhost:3007";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))
  throw Error("Synthetic local verification only.");
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    new URL(origin).port,
  ],
  {
    env: {
      ...process.env,
      RESERVE_DEV_PREVIEW: "true",
      RESERVE_VERIFY: "true",
      RESERVE_PREVIEW_PATH: `.data/verify-${Date.now()}`,
      APP_ORIGIN: origin,
    },
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
  server.on("exit", () => reject(Error(serverLog)));
  setTimeout(() => reject(Error("Startup timeout")), 30000).unref();
});
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {}),
  args: ["--no-sandbox"],
});
await mkdir("artifacts", { recursive: true });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on("pageerror", (e) => errors.push(e.message));
async function post(path, input) {
  const r = await page.request.post(origin + path, {
    headers: { Origin: origin },
    data: input,
  });
  const d = await r.json();
  assert.ok(r.ok(), JSON.stringify(d));
  return d;
}
try {
  await page.goto(origin + "/signin?next=/studio/commerce");
  await page.getByRole("button", { name: "Open Neil’s owner view" }).click();
  await page.waitForURL("**/studio/commerce");
  await page
    .getByRole("heading", { name: "Inventory and commissioning" })
    .waitFor();
  await page.getByText("Commerce settings", { exact: true }).click();
  await page.getByLabel("Approved tax rate (%)", { exact: true }).fill("5");
  await page
    .getByLabel("Approval reference / applicability", { exact: true })
    .fill("Synthetic browser-test rate");
  await page.getByLabel("Tax configuration approved", { exact: true }).check();
  await page.getByLabel("Enable location commerce", { exact: true }).check();
  await page.getByRole("button", { name: "Save commerce settings" }).click();
  await page.getByRole("status").getByText("Saved.").waitFor();
  await page
    .getByText("Legacy Reserve product catalog", { exact: true })
    .click();
  await page.getByLabel("SKU", { exact: true }).fill("VERIFY-OIL");
  await page
    .getByLabel("Product name", { exact: true })
    .fill("Verification oil");
  await page.getByLabel("Approved price ($)", { exact: true }).fill("25");
  await page
    .getByLabel("Taxable under approved configuration", { exact: true })
    .check();
  await page.getByLabel("Enabled", { exact: true }).check();
  await page.getByRole("button", { name: "Save product" }).click();
  await page
    .getByLabel("Quantity — Verification oil", { exact: true })
    .waitFor();
  await page
    .getByText("Stock count / receipt adjustment", { exact: true })
    .click();
  await page
    .getByLabel("Unit change (positive receive / negative adjustment)", {
      exact: true,
    })
    .fill("3");
  await page
    .getByLabel("Count or receipt reason", { exact: true })
    .fill("Synthetic opening stock");
  await page.getByRole("button", { name: "Record adjustment" }).click();
  await page
    .getByText("Legacy Reserve · $25.00 · 3 available / 0 held", {
      exact: true,
    })
    .waitFor();
  await page
    .getByLabel("Quantity — Verification oil", { exact: true })
    .fill("1");
  await page
    .getByRole("button", { name: "Create checkout", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Record cash received", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Record cash received", exact: true })
    .click();
  await page
    .getByText("paid · $26.25 · refunded $0.00", { exact: true })
    .waitFor();
  await page
    .getByText("Legacy Reserve · $25.00 · 2 available / 0 held", {
      exact: true,
    })
    .waitFor();
  const receiptLink = await page
    .getByRole("link", { name: "Itemized receipt", exact: true })
    .getAttribute("href");
  await page.getByText("Refund payment", { exact: true }).click();
  await page.getByLabel("Refund amount ($)", { exact: true }).fill("5");
  await page
    .getByLabel("Refund reason", { exact: true })
    .fill("Synthetic refund");
  await page
    .getByRole("button", { name: "Record cash refunded", exact: true })
    .click();
  await page
    .getByText("part refunded · $26.25 · refunded $5.00", { exact: true })
    .waitFor();
  await page.getByText("Return sellable stock", { exact: true }).click();
  await page.getByLabel("Units physically returned", { exact: true }).fill("1");
  await page
    .getByLabel("Condition / reason", { exact: true })
    .fill("Sealed synthetic return");
  await page
    .getByRole("button", { name: "Confirm sellable return", exact: true })
    .click();
  await page
    .getByText("Legacy Reserve · $25.00 · 3 available / 0 held", {
      exact: true,
    })
    .waitFor();
  await page.screenshot({
    path: "artifacts/commerce-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "artifacts/commerce-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    ),
    false,
    "Mobile overflow",
  );
  await page.goto(origin + receiptLink);
  await page
    .getByRole("heading", { name: "Total: $26.25", exact: true })
    .waitFor();
  const badWebhook = await page.request.post(origin + "/api/commerce/webhook", {
    data: "{}",
  });
  assert.ok([400, 503].includes(badWebhook.status()));
  await post("/api/auth", { action: "preview", identity: "preview-client" });
  const denied = await page.request.get(
    origin + "/api/commerce?location=eunice",
  );
  assert.equal(denied.status(), 403);
  const receiptDenied = await page.request.get(
    origin + "/api/commerce?order=" + receiptLink.split("/").pop(),
  );
  assert.equal(receiptDenied.status(), 404);
  assert.equal(errors.length, 0, errors.join("\n"));
  await writeFile(
    "artifacts/commerce-verification.json",
    JSON.stringify(
      {
        passed: true,
        checks: [
          "commerce commissioning through UI",
          "SKU and opening stock",
          "cash checkout and receipt",
          "partial refund",
          "explicit sellable return",
          "390px mobile overflow",
          "customer staff and receipt access denied",
          "unsigned webhook blocked",
        ],
        errors,
      },
      null,
      2,
    ),
  );
  console.log("Commerce browser verification passed.");
} catch (e) {
  await page.screenshot({
    path: "artifacts/commerce-failure.png",
    fullPage: true,
  });
  console.error(await page.locator("body").innerText());
  throw e;
} finally {
  await browser.close();
  server.kill("SIGTERM");
  await writeFile("artifacts/commerce-server.log", serverLog);
}
