import { randomUUID } from "node:crypto";
import { BookingError, type Actor } from "../../lib/booking";
import type { Database, Queryable } from "../../lib/db";
import { orderAccess, audit, moveStock, lines } from "./orders";
import type { Order, Payment, Processor, Session } from "./types";
import { stripeProcessor, type PaymentEvent } from "./stripe";
export async function beginCardPayment(
  db: Database,
  actor: Actor,
  id: string,
  revision: number,
  processor: Processor = stripeProcessor,
) {
  const o = await db.transaction(async (tx) => {
    const o = await orderAccess(tx, actor, id, "checkout", true);
    if (o.total < 50)
      throw new BookingError(
        "Card checkout requires at least $0.50. Use cash for smaller orders.",
        400,
      );
    const [p] = await tx.query<Payment>(
      "SELECT * FROM reserve_payments WHERE order_id=$1",
      [id],
    );
    if (p) {
      if (p.method !== "stripe" || !["creating", "pending"].includes(p.state))
        throw new BookingError(
          "Order payment is already settled or requires review.",
          409,
        );
      if (!p.session_id && Date.now() - +new Date(p.created_at) > 23 * 3600000)
        throw new BookingError(
          "This unresolved checkout is beyond its safe retry window. Reconcile with the processor.",
          409,
        );
      return o;
    }
    if (o.status !== "draft" || o.revision !== revision)
      throw new BookingError("Order changed. Reload.", 409);
    await tx.query(
      "INSERT INTO reserve_payments(id,order_id,method,state,amount) VALUES($1,$2,'stripe','creating',$3)",
      [randomUUID(), id, o.total],
    );
    await tx.query(
      "UPDATE reserve_orders SET status='pending',revision=revision+1 WHERE id=$1",
      [id],
    );
    await audit(tx, actor.id, o, "card_checkout_requested");
    return o;
  });
  const [payment] = await db.query<Payment>(
    "SELECT * FROM reserve_payments WHERE order_id=$1",
    [id],
  );
  if (payment.session_id) return { url: payment.checkout_url, payment };
  try {
    const session = await processor.create(o, await lines(db, o.id));
    if (
      session.metadata.reserve_order_id !== id ||
      session.amount_total !== o.total ||
      session.currency !== "usd"
    )
      throw new BookingError(
        "Processor session does not match the order.",
        409,
      );
    await db.query(
      "UPDATE reserve_payments SET session_id=$1,checkout_url=$2,expires_at=to_timestamp($3),state=CASE WHEN state='creating' THEN 'pending' ELSE state END,error_code=NULL WHERE order_id=$4 AND (session_id IS NULL OR session_id=$1)",
      [session.id, session.url, session.expires_at, id],
    );
    return {
      url: session.url,
      payment: (
        await db.query<Payment>(
          "SELECT * FROM reserve_payments WHERE order_id=$1",
          [id],
        )
      )[0],
    };
  } catch (e) {
    await db.query(
      "UPDATE reserve_payments SET error_code='checkout_unresolved' WHERE order_id=$1 AND state='creating'",
      [id],
    );
    throw e;
  }
}
export async function settleSession(
  db: Database,
  id: string,
  session: Session,
  actor = "processor",
) {
  return db.transaction(async (tx) => {
    const [o] = await tx.query<Order>(
      "SELECT * FROM reserve_orders WHERE id=$1 FOR UPDATE",
      [id],
    );
    if (!o) throw new BookingError("Order not found.", 404);
    const [p] = await tx.query<Payment>(
      "SELECT * FROM reserve_payments WHERE order_id=$1 FOR UPDATE",
      [id],
    );
    if (
      !p ||
      p.method !== "stripe" ||
      (p.session_id && p.session_id !== session.id) ||
      session.metadata.reserve_order_id !== id ||
      session.amount_total !== o.total ||
      session.currency !== "usd"
    )
      throw new BookingError("Processor order mapping mismatch.", 409);
    if (p.state === "succeeded") return o;
    if (session.status === "complete" && session.payment_status === "paid") {
      if (o.status !== "pending" || !session.payment_intent)
        throw new BookingError(
          "Late or unmapped payment requires reconciliation.",
          409,
        );
      await moveStock(tx, o, "sale", actor);
      await tx.query(
        "UPDATE reserve_payments SET session_id=$1,payment_intent=$2,state='succeeded',settled_at=now(),error_code=NULL WHERE order_id=$3",
        [session.id, session.payment_intent, id],
      );
      const [paid] = await tx.query<Order>(
        "UPDATE reserve_orders SET status='paid',paid_at=now(),revision=revision+1 WHERE id=$1 RETURNING *",
        [id],
      );
      await audit(tx, actor, o, "card_payment_settled");
      return paid;
    }
    if (session.status === "expired") {
      if (o.status === "void") return o;
      if (o.status !== "pending")
        throw new BookingError("Payment state requires review.", 409);
      await moveStock(tx, o, "release", actor);
      await tx.query(
        "UPDATE reserve_payments SET session_id=$1,state='expired',error_code=NULL WHERE order_id=$2",
        [session.id, id],
      );
      const [voided] = await tx.query<Order>(
        "UPDATE reserve_orders SET status='void',revision=revision+1 WHERE id=$1 RETURNING *",
        [id],
      );
      await audit(tx, actor, o, "checkout_expired");
      return voided;
    }
    return o;
  });
}
export async function reconcilePayment(
  db: Database,
  actor: Actor,
  id: string,
  expire = false,
  processor: Processor = stripeProcessor,
) {
  await orderAccess(db, actor, id);
  const [p] = await db.query<Payment>(
    "SELECT * FROM reserve_payments WHERE order_id=$1",
    [id],
  );
  if (!p?.session_id)
    throw new BookingError(
      "No mapped checkout yet. Retry the original checkout request or investigate the processor.",
    );
  let s = await processor.session(p.session_id);
  if (expire && s.status === "open") s = await processor.expire(s.id);
  return settleSession(db, id, s, actor.id);
}
export async function ingestEvent(db: Queryable, event: PaymentEvent) {
  const allowed = [
    "checkout.session.completed",
    "checkout.session.expired",
    "checkout.session.async_payment_succeeded",
    "checkout.session.async_payment_failed",
    "refund.created",
    "refund.updated",
    "refund.failed",
  ];
  if (!allowed.includes(event.type)) return;
  await db.query(
    "INSERT INTO reserve_payment_events(id,type,object_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
    [event.id, event.type, event.data.object.id],
  );
}
export async function processEvents(
  db: Database,
  processor: Processor = stripeProcessor,
  limit = 20,
) {
  const events = await db.query<{
    id: string;
    type: string;
    object_id: string;
  }>(
    "SELECT id,type,object_id FROM reserve_payment_events WHERE state IN ('pending','failed') AND due_at<=now() AND attempts<10 ORDER BY CASE WHEN state='pending' THEN 0 ELSE 1 END,created_at LIMIT $1",
    [Math.min(limit, 50)],
  );
  const results = [];
  for (const event of events) {
    await db.query(
      "UPDATE reserve_payment_events SET attempts=attempts+1 WHERE id=$1",
      [event.id],
    );
    try {
      let orderId: string | null = null;
      if (event.type.startsWith("checkout.")) {
        const s = await processor.session(event.object_id);
        orderId = s.metadata.reserve_order_id || null;
        if (!orderId) throw new BookingError("Missing order mapping.");
        await settleSession(db, orderId, s);
      } else {
        const { settleRefund } = await import("./refunds");
        const refund = await processor.getRefund(event.object_id);
        const [row] = await db.query<{ order_id: string }>(
          "SELECT order_id FROM reserve_refunds WHERE id=$1 OR processor_id=$2",
          [refund.metadata.reserve_refund_id || "", refund.id],
        );
        if (!row)
          throw new BookingError(
            "Unmapped external refund requires reconciliation.",
          );
        orderId = row.order_id;
        await settleRefund(db, refund);
      }
      await db.query(
        "UPDATE reserve_payment_events SET state='processed',order_id=$1,processed_at=now(),error_code=NULL WHERE id=$2",
        [orderId, event.id],
      );
      results.push("processed");
    } catch {
      await db.query(
        "UPDATE reserve_payment_events SET state='failed',error_code='processor_reconciliation_required',due_at=now()+interval '5 minutes' WHERE id=$1 AND state<>'processed'",
        [event.id],
      );
      results.push("failed");
    }
  }
  return results;
}
