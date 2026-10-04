import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { schema, seed, wrapPglite } from "../lib/db";
import { resolveAccess } from "../domains/access";
import type { Actor } from "../lib/booking";
import {
  configureShopify,
  importOrder,
  linkSale,
  unlinkSale,
  saleReceipt,
  syncRecent,
} from "../domains/shopify";
import {
  cents,
  graphql,
  shopifyClient,
  type RemoteOrder,
  type ShopifyClient,
} from "../domains/shopify/client";
import {
  ingestShopify,
  processShopifyEvents,
  verifyShopify,
  reconcileImported,
  discoverSales,
} from "../domains/shopify/events";
import {
  legacyRegisterAllowed,
  requireLegacyRegister,
} from "../domains/shopify/mode";
const pg = new PGlite(),
  db = wrapPglite(pg);
let owner: Actor, customer: Actor, other: Actor;
const store = "reserve-fixture.myshopify.com",
  location = "gid://shopify/Location/101";
const remote = new Map<string, RemoteOrder>();
let idSequence = 100;
const usd = (amount: string) => ({
  shopMoney: { amount, currencyCode: "USD" },
});
function newOrder(overrides: Partial<RemoteOrder> = {}) {
  const o: RemoteOrder = {
    id: `gid://shopify/Order/${++idSequence}`,
    name: `#${idSequence}`,
    sourceName: "pos",
    retailLocation: { id: location },
    test: false,
    cancelledAt: null,
    updatedAt: new Date().toISOString(),
    processedAt: new Date().toISOString(),
    displayFinancialStatus: "PAID",
    totalPriceSet: usd("50.25"),
    totalReceivedSet: usd("50.25"),
    totalRefundedSet: usd("0.00"),
    lineItems: {
      nodes: [
        {
          id: "gid://shopify/LineItem/1",
          name: "Synthetic service and oil",
          quantity: 1,
        },
      ],
      pageInfo: { hasNextPage: false },
    },
    ...overrides,
  };
  remote.set(o.id, o);
  return o;
}
const fake: ShopifyClient = {
  async locations() {
    return {
      nodes: [
        { id: location, name: "Synthetic Eunice", isActive: true },
        {
          id: "gid://shopify/Location/202",
          name: "Synthetic Lafayette",
          isActive: true,
        },
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
    };
  },
  async order(id) {
    const o = remote.get(id);
    if (!o) throw Error("missing");
    return structuredClone(o);
  },
  async recent() {
    return {
      nodes: [...remote.values()]
        .filter(
          (o) => o.sourceName === "pos" && o.retailLocation?.id === location,
        )
        .map((o) => ({ id: o.id })),
      pageInfo: { hasNextPage: false, endCursor: null },
    };
  },
  async inventory() {
    return { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } };
  },
};
async function appointment() {
  const id = randomUUID();
  await db.query(
    "INSERT INTO reserve_appointments(id,client_id,customer_id,provider_id,service_id,location_id,organization_id,starts_at,ends_at,busy_until,original_start,price,status,request_key) VALUES($1,'preview-client','preview-client','katie','signature','eunice','reserve',now(),now()+interval '45 minutes',now()+interval '60 minutes',now(),4500,'checked_in',$2)",
    [id, randomUUID()],
  );
  return id;
}
test.before(async () => {
  process.env.SHOPIFY_SHOP_DOMAIN = store;
  await pg.waitReady;
  await schema(db);
  await seed(db);
  async function actor(id: string) {
    return resolveAccess(
      db,
      (
        await db.query<Actor>("SELECT * FROM reserve_users WHERE id=$1", [id])
      )[0],
    );
  }
  owner = await actor("preview-neil");
  customer = await actor("preview-client");
  other = await actor("preview-other");
  await configureShopify(
    db,
    owner,
    { locationId: "eunice", shopifyLocationId: location, enabled: true },
    fake,
  );
});
test.after(async () => {
  await pg.close();
});
test("Shopify decimal money is exact and rejects unsupported or malformed amounts", () => {
  assert.equal(cents(usd("19.99")), 1999);
  assert.equal(cents(usd("0.1")), 10);
  assert.throws(() => cents(usd("1.999")));
  assert.throws(() =>
    cents({ shopMoney: { amount: "5", currencyCode: "EUR" } }),
  );
  assert.throws(() => cents(usd("9999999999999")));
});
test("canonical POS imports are idempotent and never alter local stock or appointments", async () => {
  const o = newOrder();
  const [a, b] = await Promise.all([
    importOrder(db, "eunice", o.id, fake),
    importOrder(db, "eunice", o.id, fake),
  ]);
  assert.equal(a.id, b.id);
  assert.equal(a.total, 5025);
  assert.equal(
    (await db.query("SELECT * FROM reserve_stock_movements")).length,
    0,
  );
  assert.equal(a.appointment_id, null);
});
test("wrong locations, online sales, wrong returned IDs and oversized receipts fail closed", async () => {
  for (const o of [
    newOrder({ retailLocation: { id: "gid://shopify/Location/999" } }),
    newOrder({ sourceName: "web", retailLocation: null }),
    newOrder({ lineItems: { nodes: [], pageInfo: { hasNextPage: true } } }),
    newOrder({
      totalReceivedSet: { shopMoney: { amount: "50", currencyCode: "CAD" } },
    }),
  ])
    await assert.rejects(importOrder(db, "eunice", o.id, fake));
  const o = newOrder();
  await assert.rejects(
    importOrder(db, "eunice", o.id, { ...fake, order: async () => newOrder() }),
  );
});
test("signed raw-body deliveries reject wrong shops, changed bytes and malformed signatures; large IDs survive", () => {
  const raw = Buffer.from('{"id":9007199254740993123}');
  const h = new Headers({
    "x-shopify-hmac-sha256": createHmac("sha256", "secret")
      .update(raw)
      .digest("base64"),
    "x-shopify-shop-domain": store,
    "x-shopify-topic": "orders/paid",
    "x-shopify-webhook-id": "delivery-one",
  });
  assert.equal(
    verifyShopify(raw, h, "secret").orderId,
    "gid://shopify/Order/9007199254740993123",
  );
  assert.throws(() => verifyShopify(Buffer.from(raw + " "), h, "secret"));
  h.set("x-shopify-shop-domain", "wrong.myshopify.com");
  assert.throws(() => verifyShopify(raw, h, "secret"));
});
test("duplicate and unordered events use current canonical refund state without restocking", async () => {
  const o = newOrder();
  await importOrder(db, "eunice", o.id, fake);
  o.totalRefundedSet = usd("10.00");
  o.displayFinancialStatus = "PARTIALLY_REFUNDED";
  o.updatedAt = new Date(Date.now() + 1000).toISOString();
  const event = {
    shop: store,
    id: "duplicate-event",
    topic: "orders/paid",
    orderId: o.id,
  };
  await ingestShopify(db, event);
  await ingestShopify(db, event);
  await processShopifyEvents(db, fake);
  const sale = await importOrder(db, "eunice", o.id, fake);
  assert.equal(sale.refunded, 1000);
  assert.equal(
    (
      await db.query(
        "SELECT * FROM reserve_shopify_events WHERE event_id='duplicate-event'",
      )
    ).length,
    1,
  );
  assert.equal(
    (await db.query("SELECT * FROM reserve_stock_movements")).length,
    0,
  );
  o.updatedAt = new Date(Date.now() - 10000).toISOString();
  o.totalRefundedSet = usd("0.00");
  assert.equal((await importOrder(db, "eunice", o.id, fake)).refunded, 1000);
});
test("linking verifies canonical sale, ownership, appointment status and a single winning sale", async () => {
  const visit = await appointment(),
    o1 = newOrder(),
    o2 = newOrder();
  const a = await importOrder(db, "eunice", o1.id, fake),
    b = await importOrder(db, "eunice", o2.id, fake);
  const results = await Promise.allSettled(
    [a, b].map((s) =>
      linkSale(
        db,
        owner,
        {
          locationId: "eunice",
          saleId: s.id,
          appointmentId: visit,
          reason: "Reviewed service plus retail",
        },
        fake,
      ),
    ),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const [linked] = await db.query<{ id: string }>(
    "SELECT id FROM reserve_shopify_orders WHERE appointment_id=$1",
    [visit],
  );
  assert.equal((await saleReceipt(db, customer, linked.id)).received, 5025);
  await assert.rejects(saleReceipt(db, other, linked.id));
  assert.equal(
    (
      await db.query("SELECT status FROM reserve_appointments WHERE id=$1", [
        visit,
      ])
    )[0].status,
    "checked_in",
  );
  assert.equal(
    (
      await db.query(
        "SELECT * FROM reserve_shopify_link_history WHERE sale_id=$1",
        [linked.id],
      )
    ).length,
    1,
  );
  await assert.rejects(
    db.query(
      "UPDATE reserve_shopify_link_history SET reason='changed' WHERE sale_id=$1",
      [linked.id],
    ),
  );
});
test("test, unpaid, cancelled sales cannot establish a customer payment link", async () => {
  for (const o of [
    newOrder({ test: true }),
    newOrder({ displayFinancialStatus: "PENDING" }),
    newOrder({ cancelledAt: new Date().toISOString() }),
  ]) {
    const sale = await importOrder(db, "eunice", o.id, fake);
    await assert.rejects(
      linkSale(
        db,
        owner,
        {
          locationId: "eunice",
          saleId: sale.id,
          appointmentId: await appointment(),
          reason: "Attempt",
        },
        fake,
      ),
    );
  }
});
test("commissioning is owner-only and cannot change a location that already has sales", async () => {
  await assert.rejects(
    configureShopify(
      db,
      customer,
      { locationId: "eunice", shopifyLocationId: location, enabled: true },
      fake,
    ),
  );
  await assert.rejects(
    configureShopify(
      db,
      owner,
      {
        locationId: "eunice",
        shopifyLocationId: "gid://shopify/Location/202",
        enabled: true,
      },
      fake,
    ),
  );
  await assert.rejects(syncRecent(db, customer, "eunice", undefined, fake));
});
test("failed and unmapped deliveries persist without inventing Reserve revenue", async () => {
  await ingestShopify(db, {
    shop: store,
    id: "missing-order",
    topic: "orders/updated",
    orderId: "gid://shopify/Order/404",
  });
  const online = newOrder({ sourceName: "web", retailLocation: null });
  await ingestShopify(db, {
    shop: store,
    id: "online-order",
    topic: "orders/paid",
    orderId: online.id,
  });
  await processShopifyEvents(db, fake);
  assert.equal(
    (
      await db.query(
        "SELECT state FROM reserve_shopify_events WHERE event_id='missing-order'",
      )
    )[0].state,
    "failed",
  );
  assert.equal(
    (
      await db.query(
        "SELECT state FROM reserve_shopify_events WHERE event_id='online-order'",
      )
    )[0].state,
    "unmapped",
  );
  assert.equal(
    (
      await db.query(
        "SELECT id FROM reserve_shopify_orders WHERE shopify_order_id=$1",
        [online.id],
      )
    ).length,
    0,
  );
  assert.ok((await reconcileImported(db, fake)).attempted > 0);
});
test("reviewed link corrections revoke customer access and preserve append-only history", async () => {
  const o = newOrder(),
    sale = await importOrder(db, "eunice", o.id, fake),
    visit = await appointment();
  await linkSale(
    db,
    owner,
    {
      locationId: "eunice",
      saleId: sale.id,
      appointmentId: visit,
      reason: "Reviewed sale",
    },
    fake,
  );
  await assert.rejects(
    unlinkSale(db, customer, {
      locationId: "eunice",
      saleId: sale.id,
      reason: "Not authorized",
    }),
  );
  await unlinkSale(db, owner, {
    locationId: "eunice",
    saleId: sale.id,
    reason: "Wrong customer selected; correcting receipt",
  });
  await assert.rejects(saleReceipt(db, customer, sale.id));
  assert.deepEqual(
    (
      await db.query(
        "SELECT action FROM reserve_shopify_link_history WHERE sale_id=$1 ORDER BY id",
        [sale.id],
      )
    ).map((r) => r.action),
    ["link", "unlink"],
  );
});
test("Shopify authorization renews cached tokens, pins API version and sends no customer fields", async () => {
  const previous = globalThis.fetch;
  const originalNow = Date.now;
  process.env.SHOPIFY_CLIENT_ID = "fixture-id";
  process.env.SHOPIFY_CLIENT_SECRET = "fixture-secret";
  const calls: { url: string; body: string }[] = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), body: String(init?.body || "") });
    if (String(url).includes("oauth"))
      return new Response(
        JSON.stringify({ access_token: "fixture-token", expires_in: 86399 }),
        { status: 200 },
      );
    return new Response(
      JSON.stringify({
        data: {
          locations: {
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
      }),
      { status: 200 },
    );
  };
  try {
    await shopifyClient.locations();
    await shopifyClient.locations();
    assert.equal(calls.filter((c) => c.url.includes("oauth")).length, 1);
    const later = originalNow() + 86400000;
    Date.now = () => later;
    await shopifyClient.locations();
    assert.equal(calls.filter((c) => c.url.includes("oauth")).length, 2);
    assert.ok(calls[1].url.includes("2026-07/graphql.json"));
    assert.ok(!calls[1].body.includes("email"));
  } finally {
    globalThis.fetch = previous;
    Date.now = originalNow;
    delete process.env.SHOPIFY_CLIENT_ID;
    delete process.env.SHOPIFY_CLIENT_SECRET;
  }
});
test("legacy register requires explicit nonproduction investigation switch", () => {
  const old = process.env.RESERVE_LEGACY_COMMERCE_PREVIEW;
  delete process.env.RESERVE_LEGACY_COMMERCE_PREVIEW;
  assert.equal(legacyRegisterAllowed(), false);
  assert.throws(() => requireLegacyRegister());
  process.env.RESERVE_LEGACY_COMMERCE_PREVIEW = "true";
  assert.equal(legacyRegisterAllowed(), true);
  if (old === undefined) delete process.env.RESERVE_LEGACY_COMMERCE_PREVIEW;
  else process.env.RESERVE_LEGACY_COMMERCE_PREVIEW = old;
});

test("missed-event backfill freezes its window and advances only after a complete page", async () => {
  const o = newOrder();
  let fail = true;
  let seenWindow: unknown;
  const scan: ShopifyClient = {
    ...fake,
    async recent(_location, after, window) {
      assert.equal(after, undefined);
      seenWindow = window;
      return {
        nodes: [{ id: o.id }],
        pageInfo: { hasNextPage: true, endCursor: "next-page" },
      };
    },
    async order(id) {
      if (fail) throw Error("outage");
      return fake.order(id);
    },
  };
  await assert.rejects(discoverSales(db, scan));
  const [first] = await db.query(
    "SELECT scan_from,scan_until,scan_cursor FROM reserve_shopify_locations WHERE location_id='eunice'",
  );
  assert.ok(first.scan_until);
  assert.equal(first.scan_cursor, null);
  fail = false;
  await discoverSales(db, scan);
  const [second] = await db.query(
    "SELECT scan_from,scan_until,scan_cursor FROM reserve_shopify_locations WHERE location_id='eunice'",
  );
  assert.equal(second.scan_cursor, "next-page");
  assert.deepEqual(second.scan_until, first.scan_until);
  assert.ok(seenWindow);
  await discoverSales(db, {
    ...fake,
    async recent(_location, after) {
      assert.equal(after, "next-page");
      return { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } };
    },
  });
  const [done] = await db.query(
    "SELECT scan_until,scan_cursor FROM reserve_shopify_locations WHERE location_id='eunice'",
  );
  assert.equal(done.scan_until, null);
  assert.equal(done.scan_cursor, null);
});

test("Shopify browser roles remain denied and runtime grants preserve immutable correction history", async () => {
  await db.exec(await readFile("scripts/runtime-role.sql", "utf8"));
  await db.exec(await readFile("scripts/shopify-runtime-grants.sql", "utf8"));
  await db.exec(
    "CREATE ROLE shopify_browser NOLOGIN; GRANT USAGE ON SCHEMA public TO shopify_browser; GRANT SELECT ON reserve_shopify_orders,reserve_shopify_events,reserve_shopify_link_history TO shopify_browser;",
  );
  await db.transaction(async (tx) => {
    await tx.exec("SET LOCAL ROLE shopify_browser");
    assert.equal(
      (await tx.query("SELECT * FROM reserve_shopify_orders")).length,
      0,
    );
    assert.equal(
      (await tx.query("SELECT * FROM reserve_shopify_events")).length,
      0,
    );
  });
  await db.transaction(async (tx) => {
    await tx.exec("SET LOCAL ROLE reserve_runtime");
    assert.ok((await tx.query("SELECT * FROM reserve_shopify_orders")).length);
  });
  await assert.rejects(
    db.transaction(async (tx) => {
      await tx.exec("SET LOCAL ROLE reserve_runtime");
      await tx.query(
        "UPDATE reserve_shopify_link_history SET reason='invalid'",
      );
    }),
  );
});
