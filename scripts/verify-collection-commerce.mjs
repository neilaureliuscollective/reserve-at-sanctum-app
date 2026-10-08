import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const base = "http://localhost:3000";
if (
  process.env.DATABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NODE_ENV === "production"
)
  throw Error("Commerce verification is isolated local preview only");
await mkdir("artifacts/collection-commerce", { recursive: true });
await writeFile("artifacts/collection-commerce/fixture-state.json", "{}");
const env = {
  ...process.env,
  NODE_ENV: "development",
  RESERVE_DEV_PREVIEW: "true",
  APP_ORIGIN: base,
  RESERVE_COMMERCE_PROVIDER: "shopify",
  SHOPIFY_STORE_DOMAIN: "reserve-test.myshopify.com",
  SHOPIFY_STOREFRONT_ACCESS_TOKEN: "synthetic-local-only",
  SHOPIFY_COLLECTION_HANDLE: "reserve-approved",
  SHOPIFY_API_VERSION: "2026-07",
  SHOPIFY_CHECKOUT_ENABLED: "true",
  SHOPIFY_CHECKOUT_HOSTS: "",
  RESERVE_CONCIERGE_MODEL: "",
  NODE_OPTIONS: `--require=${resolve("scripts/fixtures/shopify-storefront.cjs")}`,
};
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--webpack",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3000",
  ],
  { env, stdio: ["ignore", "pipe", "pipe"] },
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
    server.on("exit", (c) => reject(Error(`server exited ${c}`)));
    setTimeout(() => reject(Error("Startup timeout")), 30000).unref();
  });
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const guest = await browser.newContext(),
    client = await browser.newContext(),
    other = await browser.newContext(),
    staff = await browser.newContext(),
    owner = await browser.newContext();
  const page = await client.newPage(),
    visitor = await guest.newPage(),
    office = await owner.newPage();
  const errors = [];
  for (const p of [page, visitor, office]) {
    p.setDefaultTimeout(20000);
    p.on("pageerror", (e) => errors.push(e.message));
  }
  const post = (ctx, path, data, origin = base) =>
    ctx.request.post(base + path, { headers: { Origin: origin }, data });
  await visitor.goto(base + "/shop/products/synthetic-essential");
  await visitor
    .getByRole("button", { name: "Sign in to prepare checkout" })
    .waitFor();
  assert.equal(
    (
      await post(guest, "/api/shop/checkout", {
        attemptKey: crypto.randomUUID(),
        variantId: "gid://shopify/ProductVariant/10",
        quantity: 1,
      })
    ).status(),
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
    (
      await post(client, "/api/shop/checkout", {}, "https://untrusted.invalid")
    ).status(),
    403,
  );
  assert.equal((await post(staff, "/api/shop/checkout", {})).status(), 403);
  assert.equal(
    (
      await post(client, "/api/shop/checkout", {
        attemptKey: crypto.randomUUID(),
        variantId: "gid://shopify/ProductVariant/10",
        quantity: 1,
        price: 1,
      })
    ).status(),
    400,
  );
  assert.equal(
    (await staff.request.get(base + "/api/studio/commerce")).status(),
    403,
  );
  await page.goto(base + "/shop");
  await page
    .getByRole("heading", { name: "A standard you can carry." })
    .waitFor();
  await page
    .getByRole("link", { name: /PUBLISHED PRODUCT Synthetic Essential/ })
    .click();
  await page
    .getByRole("heading", { name: "Synthetic Essential", exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByLabel("Product option")
      .locator('option[value="gid://shopify/ProductVariant/11"]')
      .evaluate((option) => option.disabled),
    true,
  );
  const requested = page.waitForRequest(
    (r) => r.url().endsWith("/api/shop/checkout") && r.method() === "POST",
  );
  await page
    .getByRole("button", { name: "Prepare checkout", exact: true })
    .click();
  const body = (await requested).postDataJSON();
  await page
    .getByRole("link", { name: "Continue to Shopify checkout" })
    .waitFor();
  assert.equal(
    await page
      .getByRole("link", { name: "Continue to Shopify checkout" })
      .getAttribute("href"),
    "https://reserve-test.myshopify.com/cart/c/synthetic-local-only",
  );
  assert.ok(
    await page.getByText("CHECKOUT PREPARED · NOT A PURCHASE").isVisible(),
  );
  assert.equal(
    (
      await client.request.get(
        base + "/api/shop/checkout?attempt=" + body.attemptKey,
      )
    ).status(),
    200,
  );
  assert.equal(
    (
      await other.request.get(
        base + "/api/shop/checkout?attempt=" + body.attemptKey,
      )
    ).status(),
    404,
  );
  const again = await post(client, "/api/shop/checkout", body);
  assert.equal(again.status(), 200);
  await page.goto(base + "/aethelios");
  await page.getByRole("button", { name: "Explore grooming products" }).click();
  await page
    .getByText(/The published Collection includes Synthetic Essential/)
    .waitFor();
  await page.getByRole("link", { name: /^Synthetic Essential/ }).waitFor();
  for (const width of [320, 360, 390, 884, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await office.setViewportSize({ width, height: 900 });
    for (const path of ["/shop", "/shop/products/synthetic-essential"]) {
      await page.goto(base + path);
      await page.locator("main h1:visible").waitFor();
      await page.waitForLoadState("networkidle");
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
        `${path} overflow ${width}`,
      );
      if ([320, 390, 1440].includes(width))
        await page.screenshot({
          path: `artifacts/collection-commerce/${path === "/shop" ? "collection" : "product"}-${width}.png`,
          fullPage: true,
        });
    }
    await office.goto(base + "/studio/commerce");
    await office
      .getByRole("heading", { name: "The Collection, prepared to trade." })
      .waitFor();
    await office.waitForLoadState("networkidle");
    assert.equal(
      await office.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
      `commerce Studio overflow ${width}`,
    );
  }
  const readiness = await owner.request
    .get(base + "/api/studio/commerce")
    .then((r) => r.json());
  assert.equal(readiness.readiness.checkoutEnabled, true);
  assert.equal(readiness.overview.revenue, null);
  assert.equal(
    JSON.stringify(readiness).includes("synthetic-local-only"),
    false,
  );
  const orders = await client.request
    .get(base + "/api/orders")
    .then((r) => r.json());
  assert.equal(orders.source, "shopify");
  assert.equal(orders.orders, null);
  assert.equal(orders.state, "not_connected");
  await writeFile(
    "artifacts/collection-commerce/fixture-state.json",
    '{"fail":true}',
  );
  await page.goto(base + "/shop");
  await page
    .getByRole("heading", { name: "The live Collection could not refresh." })
    .waitFor();
  assert.equal(await page.locator(".collection-product").count(), 0);
  assert.ok(
    await page.getByText("CONCEPT COLLECTION · NOT LIVE INVENTORY").isVisible(),
  );
  await page.goto(base + "/shop/products/synthetic-essential");
  await page
    .getByRole("heading", { name: "Product information could not refresh." })
    .waitFor();
  assert.equal(
    await page.getByRole("button", { name: "Prepare checkout" }).count(),
    0,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: synthetic Shopify Collection and checkout handoff; guest/client/staff/owner boundaries; price/origin tampering; private/idempotent attempts; verified concierge; unavailable-state honesty; 320/360/390/884/1440 layouts; no page errors; no external Shopify requests or charges.",
  );
} finally {
  await writeFile("artifacts/collection-commerce/server.log", log);
  await writeFile("artifacts/collection-commerce/fixture-state.json", "{}");
  await browser?.close();
  server.kill("SIGTERM");
}
