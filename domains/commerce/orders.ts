import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { DateTime } from "luxon";
import { BookingError, type Actor, type Appointment } from "../../lib/booking";
import type { Database, Queryable, Row } from "../../lib/db";
import { requireAccess, permitted } from "../access";
import type { Order, Line, Payment } from "./types";
export const orderSchema = z
  .object({
    locationId: z.string().max(100),
    appointmentId: z.uuid().optional(),
    customerId: z.string().max(100).optional(),
    items: z
      .array(
        z
          .object({
            skuId: z.string().max(100),
            quantity: z.number().int().min(1).max(100),
          })
          .strict(),
      )
      .max(30),
    discount: z.number().int().min(0).max(1000000).default(0),
    tip: z.number().int().min(0).max(100000).default(0),
    requestKey: z.uuid(),
  })
  .strict();
export async function orderAccess(
  tx: Queryable,
  actor: Actor,
  id: string,
  capability: "checkout" | "refund" = "checkout",
  lock = false,
) {
  const [o] = await tx.query<Order>(
    `SELECT * FROM reserve_orders WHERE id=$1 ${lock ? "FOR UPDATE" : ""}`,
    [id],
  );
  if (!o) throw new BookingError("Order not found.", 404);
  // Order/receipt access is commercial, never a route into Chair context.
  requireAccess(actor, capability, o.location_id);
  return o;
}
export async function audit(
  tx: Queryable,
  actor: string,
  o: Order,
  action: string,
) {
  await tx.query(
    "INSERT INTO reserve_operation_events(actor_id,location_id,entity_id,action) VALUES($1,$2,$3,$4)",
    [actor, o.location_id, o.id, action],
  );
}
export async function lines(db: Queryable, id: string) {
  return db.query<Line>(
    "SELECT * FROM reserve_order_lines WHERE order_id=$1 ORDER BY id",
    [id],
  );
}
export async function moveStock(
  tx: Queryable,
  o: Order,
  kind: "sale" | "release",
  actor: string,
) {
  for (const line of (await lines(tx, o.id)).filter((l) => l.sku_id)) {
    const rows = await tx.query(
      `UPDATE reserve_stock SET reserved=reserved-$1,on_hand=on_hand-${kind === "sale" ? "$1" : "0"} WHERE location_id=$2 AND sku_id=$3 AND reserved>=$1 RETURNING sku_id`,
      [line.quantity, o.location_id, line.sku_id],
    );
    if (!rows.length)
      throw new BookingError(
        "Stock reservation mismatch. Reconcile this order.",
        409,
      );
    await tx.query(
      "INSERT INTO reserve_stock_movements(id,location_id,sku_id,actor_id,order_id,delta,reserved_delta,kind,reason,request_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$8,$9)",
      [
        randomUUID(),
        o.location_id,
        line.sku_id,
        actor,
        o.id,
        kind === "sale" ? -line.quantity : 0,
        -line.quantity,
        kind,
        `${kind}:${o.id}:${line.id}`,
      ],
    );
  }
}
export async function createOrder(db: Database, actor: Actor, raw: unknown) {
  const input = orderSchema.parse(raw);
  requireAccess(actor, "checkout", input.locationId);
  if (input.discount) requireAccess(actor, "discount", input.locationId);
  const items = [...input.items].sort((a, b) => a.skuId.localeCompare(b.skuId));
  if (new Set(items.map((i) => i.skuId)).size !== items.length)
    throw new BookingError("Combine repeated products into one line.");
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ ...input, items }))
    .digest("hex");
  return db.transaction(async (tx) => {
    await tx.query("SELECT id FROM reserve_locations WHERE id=$1 FOR UPDATE", [
      input.locationId,
    ]);
    const [prior] = await tx.query<Order & { fingerprint: string }>(
      "SELECT * FROM reserve_orders WHERE created_by=$1 AND request_key=$2",
      [actor.id, input.requestKey],
    );
    if (prior) {
      if (prior.fingerprint !== fingerprint)
        throw new BookingError("This request was used for another order.", 409);
      return prior;
    }
    const [config] = await tx.query<
      Row & {
        organization_id: string;
        enabled: boolean;
        tax_approved: boolean;
        tax_bps: number;
        tax_note: string;
        service_taxable: boolean;
      }
    >(
      "SELECT c.*,l.organization_id FROM reserve_commerce_settings c JOIN reserve_locations l ON l.id=c.location_id WHERE c.location_id=$1",
      [input.locationId],
    );
    if (!config?.enabled || !config.tax_approved)
      throw new BookingError(
        "Commerce is not commissioned for this location.",
        409,
      );
    const selected: {
      skuId: string | null;
      kind: string;
      name: string;
      quantity: number;
      price: number;
      taxable: boolean;
    }[] = [];
    let customerId = input.customerId || null;
    if (input.appointmentId) {
      const [a] = await tx.query<Appointment>(
        "SELECT * FROM reserve_appointments WHERE id=$1 AND location_id=$2 FOR UPDATE",
        [input.appointmentId, input.locationId],
      );
      if (!a || !["checked_in", "completed"].includes(a.status))
        throw new BookingError(
          "Checkout requires an arrived or completed visit.",
        );
      if (customerId && customerId !== a.customer_id)
        throw new BookingError("Customer does not match this visit.");
      customerId = a.customer_id;
      const [external] = await tx.query(
        "SELECT id FROM reserve_external_collections WHERE appointment_id=$1 AND reversed_by IS NULL UNION ALL SELECT id FROM reserve_shopify_orders WHERE appointment_id=$1",
        [a.id],
      );
      if (external)
        throw new BookingError(
          "This visit has an external collection. Reconcile it before creating a new charge.",
          409,
        );
      selected.push({
        skuId: null,
        kind: "service",
        name: a.snapshot.service || "Service",
        quantity: 1,
        price: a.price,
        taxable: config.service_taxable,
      });
    }
    if (customerId) {
      const [c] = await tx.query(
        "SELECT c.id FROM reserve_customers c JOIN reserve_customer_locations cl ON cl.customer_id=c.id WHERE c.id=$1 AND cl.location_id=$2 AND c.organization_id=$3",
        [customerId, input.locationId, config.organization_id],
      );
      if (!c)
        throw new BookingError("Customer not found at this location.", 404);
    }
    for (const item of items) {
      const [sku] = await tx.query<
        Row & { name: string; price: number; taxable: boolean }
      >(
        "SELECT * FROM reserve_skus WHERE id=$1 AND organization_id=$2 AND enabled FOR SHARE",
        [item.skuId, config.organization_id],
      );
      if (!sku) throw new BookingError("A selected product is unavailable.");
      const rows = await tx.query(
        "UPDATE reserve_stock SET reserved=reserved+$1 WHERE location_id=$2 AND sku_id=$3 AND on_hand-reserved>=$1 RETURNING sku_id",
        [item.quantity, input.locationId, item.skuId],
      );
      if (!rows.length)
        throw new BookingError(
          "Not enough available stock for this order.",
          409,
        );
      selected.push({
        skuId: item.skuId,
        kind: "product",
        name: sku.name,
        quantity: item.quantity,
        price: sku.price,
        taxable: sku.taxable,
      });
    }
    if (!selected.length) throw new BookingError("Add a service or product.");
    const subtotal = selected.reduce((sum, l) => sum + l.price * l.quantity, 0);
    if (input.discount > subtotal)
      throw new BookingError("Discount exceeds the sale subtotal.");
    const allocation = selected.map((l, index) => ({
      index,
      gross: l.price * l.quantity,
      discount: Math.floor(
        (input.discount * l.price * l.quantity) / (subtotal || 1),
      ),
      remainder: (input.discount * l.price * l.quantity) % (subtotal || 1),
    }));
    let remaining =
      input.discount - allocation.reduce((n, l) => n + l.discount, 0);
    for (const part of [...allocation].sort(
      (a, b) => b.remainder - a.remainder || a.index - b.index,
    )) {
      if (remaining > 0 && part.discount < part.gross) {
        part.discount++;
        remaining--;
      }
    }
    if (remaining)
      throw new BookingError("Discount allocation requires review.");
    const calculated = selected.map((l, i) => {
      const discount = allocation[i].discount;
      const tax = l.taxable
        ? Math.round(
            ((l.price * l.quantity - discount) * config.tax_bps) / 10000,
          )
        : 0;
      return { ...l, discount, tax };
    });
    const tax = calculated.reduce((sum, l) => sum + l.tax, 0),
      total = subtotal - input.discount + tax + input.tip;
    if (total <= 0 || total > 10000000)
      throw new BookingError(
        "Order total must be positive and within the sale limit.",
      );
    const [o] = await tx.query<Order>(
      "INSERT INTO reserve_orders(id,location_id,organization_id,customer_id,appointment_id,created_by,request_key,fingerprint,subtotal,discount,tax,tip,total,tax_snapshot) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb) RETURNING *",
      [
        randomUUID(),
        input.locationId,
        config.organization_id,
        customerId,
        input.appointmentId || null,
        actor.id,
        input.requestKey,
        fingerprint,
        subtotal,
        input.discount,
        tax,
        input.tip,
        total,
        JSON.stringify({
          bps: config.tax_bps,
          note: config.tax_note,
          serviceTaxable: config.service_taxable,
        }),
      ],
    );
    for (const l of calculated) {
      const id = randomUUID();
      await tx.query(
        "INSERT INTO reserve_order_lines(id,order_id,sku_id,kind,name,quantity,unit_price,discount,tax) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [
          id,
          o.id,
          l.skuId,
          l.kind,
          l.name,
          l.quantity,
          l.price,
          l.discount,
          l.tax,
        ],
      );
      if (l.skuId)
        await tx.query(
          "INSERT INTO reserve_stock_movements(id,location_id,sku_id,actor_id,order_id,delta,reserved_delta,kind,reason,request_key) VALUES($1,$2,$3,$4,$5,0,$6,'reserve','Order stock hold',$7)",
          [
            randomUUID(),
            o.location_id,
            l.skuId,
            actor.id,
            o.id,
            l.quantity,
            `reserve:${o.id}:${id}`,
          ],
        );
    }
    await audit(tx, actor.id, o, "order_created");
    return o;
  });
}
export async function cashPayment(
  db: Database,
  actor: Actor,
  id: string,
  revision: number,
) {
  return db.transaction(async (tx) => {
    const o = await orderAccess(tx, actor, id, "checkout", true);
    const [existing] = await tx.query<Payment>(
      "SELECT * FROM reserve_payments WHERE order_id=$1",
      [id],
    );
    if (existing?.method === "cash" && existing.state === "succeeded") return o;
    if (o.status !== "draft" || o.revision !== revision || existing)
      throw new BookingError(
        "This order is already in payment or changed.",
        409,
      );
    await moveStock(tx, o, "sale", actor.id);
    await tx.query(
      "INSERT INTO reserve_payments(id,order_id,method,state,amount,settled_at) VALUES($1,$2,'cash','succeeded',$3,now())",
      [randomUUID(), id, o.total],
    );
    const [paid] = await tx.query<Order>(
      "UPDATE reserve_orders SET status='paid',paid_at=now(),revision=revision+1 WHERE id=$1 RETURNING *",
      [id],
    );
    await audit(tx, actor.id, o, "cash_collected");
    return paid;
  });
}
export async function voidDraft(
  db: Database,
  actor: Actor,
  id: string,
  revision: number,
) {
  return db.transaction(async (tx) => {
    const o = await orderAccess(tx, actor, id, "checkout", true);
    if (o.status === "void") return o;
    if (o.status !== "draft" || o.revision !== revision)
      throw new BookingError(
        "Pending processor payments must be reconciled before release.",
        409,
      );
    await moveStock(tx, o, "release", actor.id);
    const [result] = await tx.query<Order>(
      "UPDATE reserve_orders SET status='void',revision=revision+1 WHERE id=$1 RETURNING *",
      [id],
    );
    await audit(tx, actor.id, o, "order_voided");
    return result;
  });
}
export async function receipt(db: Queryable, actor: Actor, id: string) {
  const [o] = await db.query<Order>(
    "SELECT * FROM reserve_orders WHERE id=$1",
    [id],
  );
  if (!o) throw new BookingError("Receipt not found.", 404);
  if (!permitted(actor, "checkout", o.location_id)) {
    const [c] = await db.query(
      "SELECT id FROM reserve_customers WHERE id=$1 AND auth_user_id=$2",
      [o.customer_id, actor.id],
    );
    if (!c) throw new BookingError("Receipt not found.", 404);
  }
  const [payment] = await db.query(
    "SELECT method,state,amount,settled_at FROM reserve_payments WHERE order_id=$1",
    [id],
  );
  return {
    order: o,
    lines: await lines(db, id),
    payment: payment || null,
    refunds: await db.query(
      "SELECT id,amount,state,reason,created_at FROM reserve_refunds WHERE order_id=$1 ORDER BY created_at",
      [id],
    ),
    returns: await db.query(
      "SELECT r.* FROM reserve_returns r JOIN reserve_order_lines l ON l.id=r.line_id WHERE l.order_id=$1",
      [id],
    ),
  };
}
export async function orders(
  db: Queryable,
  actor: Actor,
  locationId: string,
  day: string,
) {
  requireAccess(actor, "checkout", locationId);
  if (!DateTime.fromISO(day).isValid || !/^\d{4}-\d{2}-\d{2}$/.test(day))
    throw new BookingError("Choose a valid date.");
  return db.query<Order>(
    `SELECT o.*,p.method,p.state AS payment_state,p.error_code FROM reserve_orders o JOIN reserve_locations l ON l.id=o.location_id LEFT JOIN reserve_payments p ON p.order_id=o.id WHERE o.location_id=$1 AND (o.created_at AT TIME ZONE l.timezone)::date=$2::date ORDER BY o.created_at DESC LIMIT 100`,
    [locationId, day],
  );
}
export async function openOrders(
  db: Queryable,
  actor: Actor,
  locationId: string,
) {
  requireAccess(actor, "checkout", locationId);
  return db.query<Order>(
    "SELECT * FROM reserve_orders WHERE location_id=$1 AND status IN ('draft','pending') ORDER BY created_at LIMIT 100",
    [locationId],
  );
}
export async function dailyMoney(
  db: Queryable,
  actor: Actor,
  locationId: string,
  day: string,
) {
  requireAccess(actor, "checkout", locationId);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !DateTime.fromISO(day).isValid)
    throw new BookingError("Choose a valid day.");
  return db.query<{ method: string; collected: string; refunded: string }>(
    `SELECT method,sum(collected)::text AS collected,sum(refunded)::text AS refunded FROM (
 SELECT p.method,sum(p.amount) AS collected,0::bigint AS refunded FROM reserve_payments p JOIN reserve_orders o ON o.id=p.order_id JOIN reserve_locations l ON l.id=o.location_id WHERE o.location_id=$1 AND p.state='succeeded' AND (p.settled_at AT TIME ZONE l.timezone)::date=$2::date GROUP BY p.method
 UNION ALL SELECT p.method,0::bigint,sum(r.amount) FROM reserve_refunds r JOIN reserve_orders o ON o.id=r.order_id JOIN reserve_payments p ON p.order_id=o.id JOIN reserve_locations l ON l.id=o.location_id WHERE o.location_id=$1 AND r.state='succeeded' AND (r.settled_at AT TIME ZONE l.timezone)::date=$2::date GROUP BY p.method
 ) money GROUP BY method ORDER BY method`,
    [locationId, day],
  );
}
export async function ownReceipts(db: Queryable, actor: Actor) {
  return db.query<Order>(
    "SELECT o.* FROM reserve_orders o JOIN reserve_customers c ON c.id=o.customer_id WHERE c.auth_user_id=$1 ORDER BY o.created_at DESC LIMIT 100",
    [actor.id],
  );
}
