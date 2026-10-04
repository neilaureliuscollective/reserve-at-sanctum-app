import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { DateTime } from "luxon";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID, createHmac } from "node:crypto";
const origin = process.env.VERIFY_ORIGIN || "http://127.0.0.1:3017";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))
  throw Error("Local verification only.");
await mkdir("artifacts", { recursive: true });
const fixturePath = resolve("artifacts/shopify-fixture.json"),
  usd = (amount) => ({ shopMoney: { amount, currencyCode: "USD" } });
const order = {
  id: "gid://shopify/Order/1001",
  name: "#VERIFY-1001",
  sourceName: "pos",
  retailLocation: { id: "gid://shopify/Location/101" },
  test: false,
  cancelledAt: null,
  updatedAt: new Date().toISOString(),
  processedAt: new Date().toISOString(),
  displayFinancialStatus: "PAID",
  totalPriceSet: usd("70.00"),
  totalReceivedSet: usd("70.00"),
  totalRefundedSet: usd("0.00"),
  lineItems: {
    nodes: [
      {
        id: "gid://shopify/LineItem/1",
        name: "Synthetic Signature grooming",
        quantity: 1,
      },
      {
        id: "gid://shopify/LineItem/2",
        name: "Synthetic Legacy Reserve oil",
        quantity: 1,
      },
    ],
    pageInfo: { hasNextPage: false },
  },
};
const fixture = { orders: [order], available: 2 };
async function save() {
  await writeFile(fixturePath, JSON.stringify(fixture));
}
await save();
const previewPath = `.data/shopify-verify-${Date.now()}`;
const appointment = { id: randomUUID() };
await promisify(execFile)(
  process.execPath,
  [
    "--import",
    "tsx",
    "tests/fixtures/seed-shopify.ts",
    previewPath,
    appointment.id,
  ],
  { env: { ...process.env, RESERVE_VERIFY: "true" } },
);
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
      RESERVE_PREVIEW_PATH: previewPath,
      RESERVE_LEGACY_COMMERCE_PREVIEW: "false",
      RESERVE_SHOPIFY_TEST_TRANSPORT: "true",
      RESERVE_SHOPIFY_FIXTURE: fixturePath,
      APP_ORIGIN: origin,
      SHOPIFY_SHOP_DOMAIN: "reserve-verify.myshopify.com",
      SHOPIFY_CLIENT_ID: "synthetic-client",
      SHOPIFY_CLIENT_SECRET: "synthetic-secret",
      RESERVE_CRON_SECRET: "synthetic-cron",
      NODE_OPTIONS: `--import=${resolve("tests/fixtures/shopify-transport.mjs")}`,
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let serverLog = "";
server.stdout.on("data", (d) => (serverLog += d));
server.stderr.on("data", (d) => (serverLog += d));
let browser;
try {
  await new Promise((resolve, reject) => {
    server.stdout.on("data", (d) => {
      if (String(d).includes("Ready in")) resolve();
    });
    server.on("exit", () => reject(Error(serverLog)));
    setTimeout(() => reject(Error("Startup timeout")), 30000).unref();
  });
  browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  async function post(path, body) {
    const r = await page.request.post(origin + path, {
      headers: { Origin: origin },
      data: body,
    });
    const d = await r.json();
    assert.ok(r.ok(), JSON.stringify(d));
    return d;
  }
  await page.goto(origin + "/signin?next=/studio/commerce");
  await page.getByRole("button", { name: "Open Neil’s owner view" }).click();
  await page.waitForURL("**/studio/commerce");
  await page.getByRole("heading", { name: "The visit. The sale." }).waitFor();
  await page
    .getByRole("button", { name: "Verify Shopify connection", exact: true })
    .click();
  await page
    .getByLabel("Shopify location", { exact: true })
    .selectOption("gid://shopify/Location/101");
  await page
    .getByRole("button", { name: "Connect verified location", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Refresh POS sales", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Refresh POS sales", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Review #VERIFY-1001", exact: true })
    .waitFor();
  const day = DateTime.now().setZone("America/Chicago").toISODate();
  await page.getByLabel("Visit date", { exact: true }).fill(day);
  await page
    .getByRole("button", { name: "Review #VERIFY-1001", exact: true })
    .click();
  await page
    .getByLabel("Visit to link", { exact: true })
    .selectOption(appointment.id);
  await page
    .getByLabel("Receipt review note", { exact: true })
    .fill("Verified synthetic service and retail belong to this visit");
  await page
    .getByRole("checkbox", {
      name: "I checked this receipt belongs to this customer and visit.",
    })
    .check();
  await page
    .getByRole("button", { name: "Link verified sale", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Remove incorrect visit link", exact: true })
    .waitFor();
  const link = await page
    .getByRole("link", { name: "View verified sale", exact: true })
    .getAttribute("href");
  await page
    .getByRole("button", { name: "Read Shopify stock", exact: true })
    .click();
  await page
    .getByRole("heading", {
      name: "Legacy Reserve · verification oil",
      exact: true,
    })
    .waitFor();
  order.totalRefundedSet = usd("25.00");
  order.displayFinancialStatus = "PARTIALLY_REFUNDED";
  order.updatedAt = new Date().toISOString();
  fixture.available = 3;
  await save();
  await page
    .getByRole("button", { name: "Reconcile selected sale", exact: true })
    .click();
  await page
    .getByText("Received $70.00 · refunded $25.00", { exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Read Shopify stock", exact: true })
    .click();
  await page.getByText("available: 3", { exact: true }).waitFor();
  // A signed notification is stored durably; worker re-reads canonical Shopify state.
  const raw = JSON.stringify({ id: 1001, admin_graphql_api_id: order.id }),
    headers = {
      "content-type": "application/json",
      "x-shopify-shop-domain": "reserve-verify.myshopify.com",
      "x-shopify-topic": "orders/updated",
      "x-shopify-webhook-id": "browser-event",
      "x-shopify-hmac-sha256": createHmac("sha256", "synthetic-secret")
        .update(raw)
        .digest("base64"),
    };
  assert.equal(
    (
      await page.request.post(origin + "/api/shopify/webhook", {
        headers,
        data: raw,
      })
    ).status(),
    200,
  );
  assert.equal(
    (
      await page.request.post(origin + "/api/cron/shopify", {
        headers: { authorization: "Bearer synthetic-cron" },
      })
    ).status(),
    200,
  );
  assert.equal(
    (
      await page.request.post(origin + "/api/shopify/webhook", {
        headers: { ...headers, "x-shopify-hmac-sha256": "invalid" },
        data: raw,
      })
    ).status(),
    400,
  );
  assert.equal(
    (
      await page.request.post(origin + "/api/commerce", {
        headers: { Origin: origin },
        data: { action: "cash", input: { id: randomUUID(), revision: 1 } },
      })
    ).status(),
    409,
  );
  await page.screenshot({
    path: "artifacts/shopify-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    ),
    false,
    "Mobile overflow",
  );
  await page.screenshot({
    path: "artifacts/shopify-mobile.png",
    fullPage: true,
  });
  await post("/api/auth", { action: "preview", identity: "preview-client" });
  await page.goto(origin + link);
  await page.getByText("Refunded: $25.00", { exact: true }).waitFor();
  await page.goto(origin + "/account");
  await page
    .getByRole("link", {
      name: "#VERIFY-1001 · partially refunded",
      exact: true,
    })
    .waitFor();
  await post("/api/auth", { action: "preview", identity: "preview-other" });
  assert.equal(
    (
      await page.request.get(
        origin + `/api/shopify?receipt=${link.split("/").pop()}`,
      )
    ).status(),
    404,
  );
  assert.equal(
    (await page.request.get(origin + "/api/shopify?location=eunice")).status(),
    403,
  );
  assert.equal(errors.length, 0, errors.join("\n"));
  await writeFile(
    "artifacts/shopify-verification.json",
    JSON.stringify(
      {
        passed: true,
        transport: "isolated synthetic Shopify; no real payment",
        checks: [
          "owner connection and location mapping",
          "canonical POS import",
          "appointment linking",
          "refund reconciliation",
          "read-only stock",
          "signed durable webhook and worker",
          "legacy payment disabled",
          "receipt ownership",
          "account history",
          "390px overflow",
        ],
        errors,
      },
      null,
      2,
    ),
  );
  console.log("Shopify browser verification passed.");
} finally {
  await browser?.close();
  server.kill("SIGTERM");
  await writeFile("artifacts/shopify-server.log", serverLog);
}
