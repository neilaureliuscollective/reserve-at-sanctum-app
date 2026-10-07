import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { randomUUID } from "node:crypto";
import { schema, seed, wrapPglite, type Database } from "../lib/db";
import { type Actor, BookingError } from "../lib/booking";
import {
  shopifySettings,
  shopifyReadiness,
  checkoutUrl,
  type ShopifyConfig,
} from "../lib/shopify/config";
import { shopifyCollection, shopifyCheckout } from "../lib/shopify/storefront";
import {
  prepareCheckout,
  ownCheckout,
  checkoutOverview,
} from "../lib/collection-checkout";
const member: Actor = {
  id: "preview-client",
  name: "Jordan",
  email: "jordan@preview.invalid",
  role: "client",
  provider_id: null,
};
const other: Actor = {
  ...member,
  id: "preview-other",
  email: "morgan@preview.invalid",
};
const config: ShopifyConfig = {
  domain: "reserve-test.myshopify.com",
  token: "PRIVATE_TEST_TOKEN",
  collection: "reserve-approved",
  version: "2026-07",
  checkout: true,
  checkoutHosts: ["reserve-test.myshopify.com"],
};
const variant = "gid://shopify/ProductVariant/10";
function product() {
  return {
    id: "gid://shopify/Product/1",
    handle: "test-essential",
    title: "Test essential",
    description: "Synthetic test data, never published to Shopify.",
    requiresSellingPlan: false,
    featuredImage: { url: "https://cdn.shopify.com/test.png", altText: null },
    variants: {
      pageInfo: { hasNextPage: false },
      nodes: [
        {
          id: variant,
          title: "50 ml",
          availableForSale: true,
          price: { amount: "24.00", currencyCode: "USD" },
        },
      ],
    },
  };
}
function collection(products = [product()]) {
  return {
    data: {
      collection: {
        handle: config.collection,
        products: { pageInfo: { hasNextPage: false }, nodes: products },
      },
    },
  };
}
function cart() {
  return {
    data: {
      cartCreate: {
        userErrors: [],
        warnings: [],
        cart: {
          checkoutUrl: "https://reserve-test.myshopify.com/cart/c/synthetic",
          cost: { totalAmount: { amount: "24.00", currencyCode: "USD" } },
          lines: { nodes: [{ quantity: 1, merchandise: { id: variant } }] },
        },
      },
    },
  };
}
const fake: typeof fetch = async (_url, init) =>
  Response.json(
    JSON.parse(String(init?.body)).query.includes("cartCreate")
      ? cart()
      : collection(),
  );
let pg: PGlite, db: Database;
const envKeys = [
  "RESERVE_COMMERCE_PROVIDER",
  "SHOPIFY_STORE_DOMAIN",
  "SHOPIFY_STOREFRONT_ACCESS_TOKEN",
  "SHOPIFY_COLLECTION_HANDLE",
  "SHOPIFY_API_VERSION",
  "SHOPIFY_CHECKOUT_ENABLED",
  "SHOPIFY_CHECKOUT_HOSTS",
];
const oldEnv = envKeys.map((k) => process.env[k]);
before(async () => {
  pg = new PGlite();
  await pg.waitReady;
  db = wrapPglite(pg);
  await schema(db);
  await seed(db);
  Object.assign(process.env, {
    RESERVE_COMMERCE_PROVIDER: "shopify",
    SHOPIFY_STORE_DOMAIN: config.domain,
    SHOPIFY_STOREFRONT_ACCESS_TOKEN: config.token,
    SHOPIFY_COLLECTION_HANDLE: config.collection,
    SHOPIFY_API_VERSION: config.version,
    SHOPIFY_CHECKOUT_ENABLED: "true",
    SHOPIFY_CHECKOUT_HOSTS: "",
  });
});
after(async () => {
  await pg.close();
  envKeys.forEach((k, i) => {
    if (oldEnv[i] === undefined) delete process.env[k];
    else process.env[k] = oldEnv[i];
  });
});
test("Shopify configuration fails closed, requires explicit provider selection and never projects tokens", () => {
  assert.equal(shopifySettings({}).config, null);
  assert.equal(shopifyReadiness({}).checkoutEnabled, false);
  const invalid = {
    RESERVE_COMMERCE_PROVIDER: "shopify",
    SHOPIFY_STORE_DOMAIN: "https://127.0.0.1",
    SHOPIFY_STOREFRONT_ACCESS_TOKEN: config.token,
    SHOPIFY_COLLECTION_HANDLE: config.collection,
  };
  assert.equal(shopifySettings(invalid).config, null);
  assert.equal(
    JSON.stringify(shopifyReadiness(process.env)).includes(config.token),
    false,
  );
  assert.equal(shopifyReadiness(process.env).subscriptions, false);
  assert.equal(shopifyReadiness(process.env).memberPricing, false);
  assert.throws(() =>
    checkoutUrl("https://reserve-test.myshopify.com.attacker.invalid/", config),
  );
  assert.throws(() =>
    checkoutUrl("http://reserve-test.myshopify.com/", config),
  );
  assert.throws(() =>
    checkoutUrl("https://name:pass@reserve-test.myshopify.com/", config),
  );
  assert.throws(() =>
    checkoutUrl("https://reserve-test.myshopify.com:8443/", config),
  );
});
test("approved collection projects real variants/prices, excludes subscription-only products and rejects unverified images", async () => {
  const subscription = {
    ...product(),
    id: "gid://shopify/Product/2",
    requiresSellingPlan: true,
  };
  const image = {
    ...product(),
    featuredImage: {
      url: "https://unverified.invalid/tracker.png",
      altText: null,
    },
  };
  const products = await shopifyCollection(config, async () =>
    Response.json(collection([image, subscription])),
  );
  assert.equal(products.length, 1);
  assert.equal(products[0].image, null);
  assert.equal(products[0].variants[0].price.amount, "24.00");
  assert.equal(products[0].href, "/shop/products/test-essential");
  let body: Record<string, unknown> | null = null;
  await shopifyCollection(config, async (url, init) => {
    assert.equal(
      String(url),
      "https://reserve-test.myshopify.com/api/2026-07/graphql.json",
    );
    assert.equal(init?.redirect, "error");
    body = JSON.parse(String(init?.body));
    return Response.json(collection());
  });
  assert.ok(body);
  assert.equal(JSON.stringify(body).includes("preview-client"), false);
});
test("provider failures, truncation and foreign currencies never become empty or fake purchasable inventory", async () => {
  await assert.rejects(
    shopifyCollection(config, async () =>
      Response.json({ errors: [{ message: "PRIVATE_PROVIDER_BODY" }] }),
    ),
    (e) => e instanceof BookingError && !e.message.includes("PRIVATE"),
  );
  const truncated = collection();
  truncated.data.collection.products.pageInfo.hasNextPage = true;
  await assert.rejects(
    shopifyCollection(config, async () => Response.json(truncated)),
    /exceeds/,
  );
  const foreign = product();
  foreign.variants.nodes[0].price.currencyCode = "EUR";
  await assert.rejects(
    shopifyCollection(config, async () => Response.json(collection([foreign]))),
    /could not refresh/,
  );
  await assert.rejects(
    shopifyCollection(config, async () =>
      Response.json({ data: { collection: null } }),
    ),
    /could not refresh/,
  );
  await assert.rejects(
    shopifyCollection(config, async () => new Response("x".repeat(512001))),
    /could not refresh/,
  );
});
test("cart handoff validates returned merchandise, quantity, errors and checkout host, with no personal or membership payload", async () => {
  let sent: Record<string, unknown> | null = null;
  const prepared = await shopifyCheckout(
    config,
    variant,
    1,
    async (_url, init) => {
      sent = JSON.parse(String(init?.body));
      return Response.json(cart());
    },
  );
  assert.match(prepared.url, /myshopify/);
  assert.ok(sent);
  assert.equal(JSON.stringify(sent).includes("preview-client"), false);
  assert.equal(JSON.stringify(sent).includes("sellingPlanId"), false);
  assert.equal(JSON.stringify(sent).includes("discountCodes"), false);
  assert.equal(JSON.stringify(sent).includes("email"), false);
  const different = cart();
  different.data.cartCreate.cart.lines.nodes[0].merchandise.id =
    "gid://shopify/ProductVariant/999";
  await assert.rejects(
    shopifyCheckout(config, variant, 1, async () => Response.json(different)),
  );
  const badHost = cart();
  badHost.data.cartCreate.cart.checkoutUrl =
    "https://attacker.invalid/checkout";
  await assert.rejects(
    shopifyCheckout(config, variant, 1, async () => Response.json(badHost)),
  );
  const changedQuantity = cart();
  changedQuantity.data.cartCreate.cart.lines.nodes[0].quantity = 2;
  await assert.rejects(
    shopifyCheckout(config, variant, 1, async () =>
      Response.json(changedQuantity),
    ),
  );
  const rejected = cart();
  rejected.data.cartCreate.userErrors = [{ code: "UNAVAILABLE" }] as never[];
  await assert.rejects(
    shopifyCheckout(config, variant, 1, async () => Response.json(rejected)),
  );
});
test("checkout preparations are owned and idempotent, and cannot accept arbitrary prices, discounts or user IDs", async () => {
  await db.query("DELETE FROM reserve_commerce_rate");
  const attempt = randomUUID();
  let creates = 0;
  const counted: typeof fetch = async (url, init) => {
    if (JSON.parse(String(init?.body)).query.includes("cartCreate")) creates++;
    return fake(url, init);
  };
  const first = await prepareCheckout(
    db,
    member,
    { attemptKey: attempt, variantId: variant, quantity: 1 },
    counted,
  );
  assert.deepEqual(
    await prepareCheckout(
      db,
      member,
      { attemptKey: attempt, variantId: variant, quantity: 1 },
      counted,
    ),
    first,
  );
  assert.equal(creates, 1);
  assert.equal((await ownCheckout(db, member, attempt)).status, "ready");
  await assert.rejects(
    ownCheckout(db, other, attempt),
    (e) => e instanceof BookingError && e.status === 404,
  );
  await assert.rejects(
    prepareCheckout(
      db,
      member,
      { attemptKey: attempt, variantId: variant, quantity: 2 },
      counted,
    ),
    (e) => e instanceof BookingError && e.status === 409,
  );
  await assert.rejects(
    prepareCheckout(
      db,
      { ...member, role: "owner" },
      { attemptKey: randomUUID(), variantId: variant, quantity: 1 },
      counted,
    ),
    /customer accounts/,
  );
  await assert.rejects(
    prepareCheckout(
      db,
      member,
      {
        attemptKey: randomUUID(),
        variantId: variant,
        quantity: 1,
        userId: other.id,
      },
      counted,
    ),
  );
  await assert.rejects(
    prepareCheckout(
      db,
      member,
      {
        attemptKey: randomUUID(),
        variantId: variant,
        quantity: 1,
        price: 1,
        discount: "MEMBER",
      },
      counted,
    ),
  );
});
test("simultaneous retries create at most one provider cart", async () => {
  await db.query("DELETE FROM reserve_commerce_rate");
  let creates = 0;
  const slow: typeof fetch = async (url, init) => {
    if (JSON.parse(String(init?.body)).query.includes("cartCreate")) {
      creates++;
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    return fake(url, init);
  };
  const input = { attemptKey: randomUUID(), variantId: variant, quantity: 1 };
  const results = await Promise.allSettled([
    prepareCheckout(db, member, input, slow),
    prepareCheckout(db, member, input, slow),
  ]);
  assert.ok(results.some((r) => r.status === "fulfilled"));
  assert.equal(creates, 1);
  assert.equal(
    (await ownCheckout(db, member, input.attemptKey)).status,
    "ready",
  );
});
test("unpublished and sold-out variants cannot reach cart mutation; failed dispatch stays uncertain without retry", async () => {
  await db.query("DELETE FROM reserve_commerce_rate");
  let creates = 0;
  const sold = product();
  sold.variants.nodes[0].availableForSale = false;
  await assert.rejects(
    prepareCheckout(
      db,
      member,
      { attemptKey: randomUUID(), variantId: variant, quantity: 1 },
      async (_url, init) => {
        if (JSON.parse(String(init?.body)).query.includes("cartCreate"))
          creates++;
        return Response.json(collection([sold]));
      },
    ),
    /no longer available/,
  );
  await assert.rejects(
    prepareCheckout(
      db,
      member,
      {
        attemptKey: randomUUID(),
        variantId: "gid://shopify/ProductVariant/999",
        quantity: 1,
      },
      fake,
    ),
    /no longer available/,
  );
  assert.equal(creates, 0);
  const attempt = randomUUID();
  const failed: typeof fetch = async (url, init) => {
    if (JSON.parse(String(init?.body)).query.includes("cartCreate")) {
      creates++;
      throw Error("PRIVATE_TIMEOUT_BODY");
    }
    return fake(url, init);
  };
  await assert.rejects(
    prepareCheckout(
      db,
      member,
      { attemptKey: attempt, variantId: variant, quantity: 1 },
      failed,
    ),
    /could not refresh/,
  );
  assert.equal((await ownCheckout(db, member, attempt)).status, "uncertain");
  await assert.rejects(
    prepareCheckout(
      db,
      member,
      { attemptKey: attempt, variantId: variant, quantity: 1 },
      failed,
    ),
    /could not finish/,
  );
  assert.equal(creates, 1);
});
test("new attempts are atomically rate limited and ready attempts expire without silently creating new carts", async () => {
  await db.query("DELETE FROM reserve_commerce_rate");
  const attempts = Array.from({ length: 8 }, () => ({
    attemptKey: randomUUID(),
    variantId: variant,
    quantity: 1,
  }));
  const results = await Promise.allSettled(
    attempts.map((input) => prepareCheckout(db, other, input, fake)),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 6);
  const first = attempts[0];
  await db.query(
    "UPDATE reserve_checkout_intents SET created_at=now()-INTERVAL '25 hours' WHERE user_id=$1 AND attempt_key=$2",
    [other.id, first.attemptKey],
  );
  await assert.rejects(
    ownCheckout(db, other, first.attemptKey),
    (e) => e instanceof BookingError && e.status === 410,
  );
});
test("founder preparation counts never imply orders or revenue, and ledger tables have RLS without PUBLIC grants", async () => {
  await assert.rejects(
    checkoutOverview(db, { ...member, role: "operator" }),
    /owner/,
  );
  const overview = await checkoutOverview(db, { ...member, role: "owner" });
  assert.equal(overview.completedOrders, null);
  assert.equal(overview.revenue, null);
  assert.equal(JSON.stringify(overview).includes("checkout_url"), false);
  const names = ["reserve_checkout_intents", "reserve_commerce_rate"];
  const rows = await db.query<{ relrowsecurity: boolean }>(
    "SELECT relrowsecurity FROM pg_class WHERE relname=ANY($1::text[])",
    [names],
  );
  assert.equal(rows.length, 2);
  assert.ok(rows.every((r) => r.relrowsecurity));
  const grants = await db.query(
    "SELECT table_name FROM information_schema.table_privileges WHERE grantee='PUBLIC' AND table_name=ANY($1::text[])",
    [names],
  );
  assert.deepEqual(grants, []);
});
