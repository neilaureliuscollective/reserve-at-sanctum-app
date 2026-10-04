import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { schema, seed, wrapPglite } from "../lib/db";
import { resolveAccess } from "../domains/access";
import type { Actor } from "../lib/booking";
import { configureCommerce, catalog } from "../domains/commerce/catalog";
import {
  createOrder,
  cashPayment,
  voidDraft,
  receipt,
  lines,
} from "../domains/commerce/orders";
import {
  beginCardPayment,
  settleSession,
  ingestEvent,
  processEvents,
  reconcilePayment,
} from "../domains/commerce/payments";
import {
  refundOrder,
  settleRefund,
  returnStock,
} from "../domains/commerce/refunds";
import { verifyStripeEvent } from "../domains/commerce/stripe";
import type {
  Processor,
  Session,
  ProcessorRefund,
  Order,
  Refund,
} from "../domains/commerce/types";
const pg = new PGlite(),
  db = wrapPglite(pg);
let owner: Actor, client: Actor;
const sessions = new Map<string, Session>(),
  refunds = new Map<string, ProcessorRefund>();
let lose = false;
const processor: Processor = {
  async create(o) {
    let s = sessions.get(o.id);
    if (!s) {
      s = {
        id: `cs_${o.id}`,
        status: "open",
        payment_status: "unpaid",
        amount_total: o.total,
        currency: "usd",
        payment_intent: null,
        url: "https://checkout.stripe.com/mock",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        metadata: { reserve_order_id: o.id },
        livemode: false,
      };
      sessions.set(o.id, s);
    }
    if (lose) {
      lose = false;
      throw Error("network timeout after creation");
    }
    return { ...s };
  },
  async session(id) {
    const s = [...sessions.values()].find((s) => s.id === id);
    assert.ok(s);
    return { ...s };
  },
  async expire(id) {
    const s = [...sessions.values()].find((s) => s.id === id)!;
    s.status = "expired";
    return { ...s };
  },
  async refund(r, intent) {
    let result = refunds.get(r.id);
    if (!result) {
      result = {
        id: `re_${r.id}`,
        amount: r.amount,
        status: "pending",
        payment_intent: intent,
        metadata: { reserve_refund_id: r.id },
      };
      refunds.set(r.id, result);
    }
    return { ...result };
  },
  async getRefund(id) {
    return { ...[...refunds.values()].find((r) => r.id === id)! };
  },
};
const request = (items = [{ skuId: "oil", quantity: 1 }]) => ({
  locationId: "eunice",
  items,
  requestKey: randomUUID(),
});
async function stock(skuId = "oil") {
  return (
    await db.query<{ on_hand: number; reserved: number }>(
      "SELECT * FROM reserve_stock WHERE location_id='eunice' AND sku_id=$1",
      [skuId],
    )
  )[0];
}
test.before(async () => {
  await pg.waitReady;
  await schema(db);
  await seed(db);
  owner = await resolveAccess(
    db,
    (
      await db.query<Actor>(
        "SELECT * FROM reserve_users WHERE id='preview-neil'",
      )
    )[0],
  );
  client = await resolveAccess(
    db,
    (
      await db.query<Actor>(
        "SELECT * FROM reserve_users WHERE id='preview-client'",
      )
    )[0],
  );
  await configureCommerce(db, owner, {
    action: "settings",
    locationId: "eunice",
    enabled: true,
    taxBps: 500,
    serviceTaxable: false,
    taxApproved: true,
    taxNote: "Synthetic rate for tests only",
    revision: 1,
  });
  for (const [id, price] of [
    ["oil", 2500],
    ["balm", 1800],
  ] as const) {
    await configureCommerce(db, owner, {
      action: "sku",
      locationId: "eunice",
      id,
      sku: `TEST-${id}`,
      name: `Test ${id}`,
      price,
      taxable: true,
      enabled: true,
    });
    await configureCommerce(db, owner, {
      action: "adjust",
      locationId: "eunice",
      skuId: id,
      delta: 20,
      reason: "Synthetic opening count",
      requestKey: randomUUID(),
    });
  }
});
test.after(() => pg.close());
test("price, discount, tax and tip are server-owned and retries preserve immutable lines", async () => {
  const input = {
    ...request([
      { skuId: "oil", quantity: 2 },
      { skuId: "balm", quantity: 1 },
    ]),
    discount: 501,
    tip: 300,
  };
  const o = await createOrder(db, owner, input);
  assert.equal(o.subtotal, 6800);
  assert.equal(o.total, 6800 - 501 + o.tax + 300);
  assert.equal((await createOrder(db, owner, input)).id, o.id);
  await assert.rejects(
    () => createOrder(db, owner, { ...input, tip: 301 }),
    /another order/,
  );
  const l = await lines(db, o.id);
  assert.equal(
    l.reduce((n, l) => n + l.discount, 0),
    501,
  );
  await assert.rejects(
    () =>
      db.query(
        "UPDATE reserve_order_lines SET unit_price=1 WHERE order_id=$1",
        [o.id],
      ),
    /append-only/,
  );
  await configureCommerce(db, owner, {
    action: "sku",
    id: "oil",
    locationId: "eunice",
    sku: "TEST-oil",
    name: "Changed oil",
    price: 9900,
    taxable: true,
    enabled: true,
    revision: 1,
  });
  assert.equal(
    (await lines(db, o.id)).find((l) => l.sku_id === "oil")!.unit_price,
    2500,
  );
  await voidDraft(db, owner, o.id, 1);
});
test("stock reservations prevent simultaneous overselling and duplicate cash consumption", async () => {
  const available = await stock("balm");
  const results = await Promise.allSettled([
    createOrder(
      db,
      owner,
      request([{ skuId: "balm", quantity: available.on_hand }]),
    ),
    createOrder(db, owner, request([{ skuId: "balm", quantity: 1 }])),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const result = results.find((r) => r.status === "fulfilled");
  assert.equal(result?.status, "fulfilled");
  if (result?.status !== "fulfilled") return;
  const o = result.value;
  const paid = await cashPayment(db, owner, o.id, 1);
  await cashPayment(db, owner, o.id, 1);
  assert.equal((await stock("balm")).on_hand, 0);
  assert.equal(paid.status, "paid");
  await assert.rejects(
    () => voidDraft(db, owner, o.id, paid.revision),
    /Pending/,
  );
  await returnStock(db, owner, {
    orderId: o.id,
    lineId: (await lines(db, o.id))[0].id,
    quantity: available.on_hand,
    reason: "Test physical return",
    requestKey: randomUUID(),
  });
});
test("stock adjustments cannot consume held units and retries do not duplicate movements", async () => {
  const o = await createOrder(db, owner, request());
  const before = await stock();
  await assert.rejects(
    () =>
      configureCommerce(db, owner, {
        action: "adjust",
        locationId: "eunice",
        skuId: "oil",
        delta: -before.on_hand,
        reason: "Invalid count",
        requestKey: randomUUID(),
      }),
    /reserved/,
  );
  const input = {
    action: "adjust",
    locationId: "eunice",
    skuId: "oil",
    delta: 2,
    reason: "New units",
    requestKey: randomUUID(),
  };
  await configureCommerce(db, owner, input);
  await configureCommerce(db, owner, input);
  assert.equal((await stock()).on_hand, before.on_hand + 2);
  await voidDraft(db, owner, o.id, 1);
});
test("lost checkout creation response preserves stock and same remote session on retry", async () => {
  const o = await createOrder(db, owner, request());
  lose = true;
  await assert.rejects(
    () => beginCardPayment(db, owner, o.id, 1, processor),
    /timeout/,
  );
  assert.equal(
    (
      await db.query<Order>("SELECT * FROM reserve_orders WHERE id=$1", [o.id])
    )[0].status,
    "pending",
  );
  await assert.rejects(() => voidDraft(db, owner, o.id, 2), /reconciled/);
  const a = await beginCardPayment(db, owner, o.id, 1, processor),
    b = await beginCardPayment(db, owner, o.id, 1, processor);
  assert.equal(a.payment.session_id, b.payment.session_id);
  await reconcilePayment(db, owner, o.id, true, processor);
  assert.equal((await stock()).reserved, 0);
});
test("duplicate and stale webhook deliveries reconcile canonical session only once", async () => {
  const o = await createOrder(db, owner, request());
  await beginCardPayment(db, owner, o.id, 1, processor);
  const session = sessions.get(o.id)!;
  session.status = "complete";
  session.payment_status = "paid";
  session.payment_intent = `pi_${o.id}`;
  const before = await stock();
  const event = {
    id: "evt_paid",
    type: "checkout.session.completed",
    livemode: false,
    data: { object: { id: session.id } },
  };
  await ingestEvent(db, event);
  await ingestEvent(db, event);
  await ingestEvent(db, {
    ...event,
    id: "evt_stale",
    type: "checkout.session.expired",
  });
  await Promise.all([
    processEvents(db, processor),
    processEvents(db, processor),
  ]);
  assert.equal((await stock()).on_hand, before.on_hand - 1);
  assert.equal(
    (
      await db.query<Order>("SELECT * FROM reserve_orders WHERE id=$1", [o.id])
    )[0].status,
    "paid",
  );
  await assert.rejects(
    () => settleSession(db, o.id, { ...session, amount_total: 1 }),
    /mapping/,
  );
});
test("pending and partial/full refunds are not assumed successful, and returns require explicit physical stock", async () => {
  const o = await createOrder(db, owner, request());
  await beginCardPayment(db, owner, o.id, 1, processor);
  const session = sessions.get(o.id)!;
  session.status = "complete";
  session.payment_status = "paid";
  session.payment_intent = `pi_${o.id}`;
  await settleSession(db, o.id, session);
  const before = await stock();
  const input = {
    orderId: o.id,
    amount: 500,
    reason: "Partial refund",
    requestKey: randomUUID(),
  };
  const r = await refundOrder(db, owner, input, processor);
  assert.equal(r.state, "pending");
  assert.equal(
    (
      await db.query<Order>("SELECT * FROM reserve_orders WHERE id=$1", [o.id])
    )[0].refunded,
    0,
  );
  const remote = refunds.get(r.id)!;
  remote.status = "succeeded";
  await settleRefund(db, remote);
  await settleRefund(db, remote);
  assert.equal((await stock()).on_hand, before.on_hand);
  const next = await refundOrder(
    db,
    owner,
    {
      orderId: o.id,
      amount: o.total - 500,
      reason: "Remaining refund",
      requestKey: randomUUID(),
    },
    processor,
  );
  refunds.get(next.id)!.status = "succeeded";
  await settleRefund(db, refunds.get(next.id)!);
  assert.equal(
    (
      await db.query<Order>("SELECT * FROM reserve_orders WHERE id=$1", [o.id])
    )[0].status,
    "refunded",
  );
  await assert.rejects(() =>
    refundOrder(
      db,
      owner,
      {
        orderId: o.id,
        amount: 1,
        reason: "Overrefund",
        requestKey: randomUUID(),
      },
      processor,
    ),
  );
  const line = (await lines(db, o.id))[0];
  const returned = {
    orderId: o.id,
    lineId: line.id,
    quantity: 1,
    reason: "Sealed physical return",
    requestKey: randomUUID(),
  };
  await returnStock(db, owner, returned);
  await returnStock(db, owner, returned);
  assert.equal((await stock()).on_hand, before.on_hand + 1);
  await assert.rejects(
    () => returnStock(db, owner, { ...returned, requestKey: randomUUID() }),
    /sold quantity/,
  );
});
test("commerce access, tax commissioning and signatures fail closed", async () => {
  await assert.rejects(() => catalog(db, client, "eunice"), /access/);
  await assert.rejects(() => createOrder(db, client, request()), /access/);
  const o = await createOrder(db, owner, request());
  await assert.rejects(() => receipt(db, client, o.id), /not found/);
  await assert.rejects(
    () =>
      configureCommerce(db, owner, {
        action: "settings",
        locationId: "eunice",
        enabled: true,
        taxBps: 0,
        serviceTaxable: false,
        taxApproved: false,
        taxNote: "",
        revision: 2,
      }),
    /Approve/,
  );
  const raw = JSON.stringify({
      id: "evt_test",
      type: "checkout.session.completed",
      livemode: false,
      data: { object: { id: "cs_test" } },
    }),
    secret = "test_secret",
    now = 1000;
  const sig = createHmac("sha256", secret)
    .update(`${now}.${raw}`)
    .digest("hex");
  assert.equal(
    verifyStripeEvent(raw, `t=${now},v1=${sig}`, secret, now).id,
    "evt_test",
  );
  assert.throws(
    () => verifyStripeEvent(raw + " ", `t=${now},v1=${sig}`, secret, now),
    /signature/,
  );
  assert.throws(
    () => verifyStripeEvent(raw, `t=${now},v1=${sig}`, secret, now + 301),
    /signature/,
  );
  await voidDraft(db, owner, o.id, 1);
});
test("failed refund releases amount reservation and concurrent refund requests cannot over-refund", async () => {
  const o = await createOrder(db, owner, request());
  await beginCardPayment(db, owner, o.id, 1, processor);
  const s = sessions.get(o.id)!;
  s.status = "complete";
  s.payment_status = "paid";
  s.payment_intent = `pi_${o.id}`;
  await settleSession(db, o.id, s);
  const r = await refundOrder(
    db,
    owner,
    {
      orderId: o.id,
      amount: o.total,
      reason: "Will fail",
      requestKey: randomUUID(),
    },
    processor,
  );
  refunds.get(r.id)!.status = "failed";
  await settleRefund(db, refunds.get(r.id)!);
  const results = await Promise.allSettled([
    refundOrder(
      db,
      owner,
      {
        orderId: o.id,
        amount: o.total,
        reason: "One",
        requestKey: randomUUID(),
      },
      processor,
    ),
    refundOrder(
      db,
      owner,
      {
        orderId: o.id,
        amount: o.total,
        reason: "Two",
        requestKey: randomUUID(),
      },
      processor,
    ),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
});
test("reception cannot discount, adjust stock or refund; manager cannot alter merchant tax/catalog", async () => {
  const reception = {
    ...owner,
    assignments: [
      {
        organization_id: "reserve",
        location_id: "eunice",
        provider_id: null,
        role: "reception" as const,
      },
    ],
  };
  const manager = {
    ...owner,
    assignments: [
      {
        organization_id: "reserve",
        location_id: "eunice",
        provider_id: null,
        role: "manager" as const,
      },
    ],
  };
  await assert.rejects(
    () => createOrder(db, reception, { ...request(), discount: 1 }),
    /access/,
  );
  await assert.rejects(
    () =>
      configureCommerce(db, reception, {
        action: "adjust",
        locationId: "eunice",
        skuId: "oil",
        delta: 1,
        reason: "No authority",
        requestKey: randomUUID(),
      }),
    /access/,
  );
  await assert.rejects(
    () =>
      configureCommerce(db, manager, {
        action: "settings",
        locationId: "eunice",
        enabled: true,
        taxBps: 0,
        serviceTaxable: false,
        taxApproved: true,
        taxNote: "Test",
        revision: 2,
      }),
    /access/,
  );
  const o = await createOrder(db, reception, request());
  await cashPayment(db, reception, o.id, 1);
  await assert.rejects(
    () =>
      refundOrder(
        db,
        reception,
        {
          orderId: o.id,
          amount: 1,
          reason: "Unauthorized",
          requestKey: randomUUID(),
        },
        processor,
      ),
    /access/,
  );
});
test("unmapped and malformed payment events stay exceptions without consuming stock", async () => {
  const o = await createOrder(db, owner, request());
  await beginCardPayment(db, owner, o.id, 1, processor);
  const before = await stock();
  const s = sessions.get(o.id)!;
  s.currency = "eur";
  s.status = "complete";
  s.payment_status = "paid";
  s.payment_intent = "pi_bad";
  await ingestEvent(db, {
    id: "evt_wrong_currency",
    type: "checkout.session.completed",
    livemode: false,
    data: { object: { id: s.id } },
  });
  await processEvents(db, processor);
  assert.equal((await stock()).on_hand, before.on_hand);
  assert.equal(
    (
      await db.query(
        "SELECT state FROM reserve_payment_events WHERE id='evt_wrong_currency'",
      )
    )[0].state,
    "failed",
  );
  s.currency = "usd";
  s.status = "open";
  s.payment_status = "unpaid";
  await reconcilePayment(db, owner, o.id, true, processor);
});
test("daily reconciliation follows actual settlement/refund dates and cash totals", async () => {
  const { dailyMoney } = await import("../domains/commerce/orders");
  const day = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Chicago",
  });
  const o = await createOrder(db, owner, request());
  await cashPayment(db, owner, o.id, 1);
  await db.query(
    "UPDATE reserve_payments SET settled_at=now()-interval '2 days' WHERE order_id=$1",
    [o.id],
  );
  const before = await dailyMoney(db, owner, "eunice", day);
  const baseline = Number(
    before.find((m) => m.method === "cash")?.refunded || 0,
  );
  await refundOrder(
    db,
    owner,
    {
      orderId: o.id,
      amount: 123,
      reason: "Cash returned today",
      requestKey: randomUUID(),
    },
    processor,
  );
  const after = await dailyMoney(db, owner, "eunice", day);
  assert.equal(
    Number(after.find((m) => m.method === "cash")!.refunded),
    baseline + 123,
  );
  assert.equal(
    Number(after.find((m) => m.method === "cash")!.collected),
    Number(before.find((m) => m.method === "cash")?.collected || 0),
  );
});
test("retail customer receipts survive a verified guest-history claim and remain private", async () => {
  const { createCustomer, inviteCustomer, claimCustomer } = await import(
    "../domains/customers"
  );
  await db.query(
    "INSERT INTO reserve_customer_locations(customer_id,location_id) VALUES($1,'eunice') ON CONFLICT DO NOTHING",
    [client.id],
  );
  const o = await createOrder(db, owner, {
    ...request(),
    customerId: client.id,
  });
  await cashPayment(db, owner, o.id, 1);
  assert.equal((await receipt(db, client, o.id)).order.id, o.id);
  const guest = await createCustomer(db, owner, "eunice", "katie", {
    name: "Guest history",
    email: client.email,
  });
  const invitation = await inviteCustomer(db, owner, guest.id, "eunice");
  await db.query(
    "UPDATE reserve_users SET identity_verified=true WHERE id=$1",
    [client.id],
  );
  await claimCustomer(db, client, invitation.url.split("#")[1]);
  assert.equal((await receipt(db, client, o.id)).order.customer_id, guest.id);
});
