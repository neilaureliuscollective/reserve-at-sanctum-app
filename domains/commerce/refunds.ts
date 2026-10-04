import { randomUUID } from "node:crypto";
import { z } from "zod";
import { BookingError, type Actor } from "../../lib/booking";
import type { Database } from "../../lib/db";
import { orderAccess, audit } from "./orders";
import type {
  Order,
  Payment,
  Refund,
  Processor,
  ProcessorRefund,
  Line,
} from "./types";
import { stripeProcessor } from "./stripe";
const schema = z
  .object({
    orderId: z.uuid(),
    amount: z.number().int().positive().max(10000000),
    reason: z.string().trim().min(1).max(300),
    requestKey: z.uuid(),
  })
  .strict();
export async function refundOrder(
  db: Database,
  actor: Actor,
  raw: unknown,
  processor: Processor = stripeProcessor,
) {
  const input = schema.parse(raw);
  const r = await db.transaction(async (tx) => {
    const o = await orderAccess(tx, actor, input.orderId, "refund", true);
    const [prior] = await tx.query<Refund>(
      "SELECT * FROM reserve_refunds WHERE created_by=$1 AND request_key=$2",
      [actor.id, input.requestKey],
    );
    if (prior) {
      if (
        prior.order_id !== o.id ||
        prior.amount !== input.amount ||
        prior.reason !== input.reason
      )
        throw new BookingError("Refund request already used.", 409);
      return prior;
    }
    if (!["paid", "part_refunded"].includes(o.status))
      throw new BookingError("Only settled payments can be refunded.", 409);
    const [held] = await tx.query<{ amount: string }>(
      "SELECT COALESCE(sum(amount),0)::text AS amount FROM reserve_refunds WHERE order_id=$1 AND state IN ('creating','pending','succeeded')",
      [o.id],
    );
    if (Number(held.amount) + input.amount > o.total)
      throw new BookingError(
        "Refund exceeds the remaining unreserved payment.",
        409,
      );
    const [r] = await tx.query<Refund>(
      "INSERT INTO reserve_refunds(id,order_id,created_by,request_key,amount,reason,state) VALUES($1,$2,$3,$4,$5,$6,'creating') RETURNING *",
      [
        randomUUID(),
        o.id,
        actor.id,
        input.requestKey,
        input.amount,
        input.reason,
      ],
    );
    await audit(tx, actor.id, o, "refund_requested");
    return r;
  });
  if (["succeeded", "failed"].includes(r.state)) return r;
  const [p] = await db.query<Payment>(
    "SELECT * FROM reserve_payments WHERE order_id=$1",
    [r.order_id],
  );
  if (p.method === "cash")
    return settleRefund(db, {
      id: `cash:${r.id}`,
      amount: r.amount,
      status: "succeeded",
      payment_intent: null,
      metadata: { reserve_refund_id: r.id },
    });
  if (!p.payment_intent)
    throw new BookingError("Payment mapping requires review.", 409);
  if (
    !r.processor_id &&
    Date.now() - +new Date(String(r.created_at)) > 23 * 3600000
  )
    throw new BookingError(
      "Unresolved refund is beyond its safe retry window. Reconcile with the processor.",
      409,
    );
  try {
    const result = r.processor_id
      ? await processor.getRefund(r.processor_id)
      : await processor.refund(r, p.payment_intent);
    return settleRefund(db, result);
  } catch (e) {
    await db.query(
      "UPDATE reserve_refunds SET error_code='refund_unresolved' WHERE id=$1 AND state='creating'",
      [r.id],
    );
    throw e;
  }
}
export async function settleRefund(db: Database, result: ProcessorRefund) {
  return db.transaction(async (tx) => {
    const [found] = await tx.query<Refund>(
      "SELECT * FROM reserve_refunds WHERE id=$1 OR processor_id=$2",
      [result.metadata.reserve_refund_id || "", result.id],
    );
    if (!found) throw new BookingError("Refund mapping missing.", 409);
    const [o] = await tx.query<Order>(
      "SELECT * FROM reserve_orders WHERE id=$1 FOR UPDATE",
      [found.order_id],
    );
    const [r] = await tx.query<Refund>(
      "SELECT * FROM reserve_refunds WHERE id=$1 FOR UPDATE",
      [found.id],
    );
    const [p] = await tx.query<Payment>(
      "SELECT * FROM reserve_payments WHERE order_id=$1",
      [o.id],
    );
    if (
      result.amount !== r.amount ||
      (r.processor_id && r.processor_id !== result.id) ||
      (p.method === "stripe" && p.payment_intent !== result.payment_intent)
    )
      throw new BookingError("Refund mapping mismatch.", 409);
    if (r.state === "succeeded") return r;
    const state =
      result.status === "succeeded"
        ? "succeeded"
        : ["failed", "canceled"].includes(result.status || "")
          ? "failed"
          : "pending";
    if (state === "succeeded") {
      const total = o.refunded + r.amount;
      if (total > o.total)
        throw new BookingError("Refund total requires review.", 409);
      await tx.query(
        "UPDATE reserve_orders SET refunded=$1,status=$2,revision=revision+1 WHERE id=$3",
        [total, total === o.total ? "refunded" : "part_refunded", o.id],
      );
      await audit(tx, "processor", o, "refund_settled");
    }
    const [updated] = await tx.query<Refund>(
      "UPDATE reserve_refunds SET processor_id=$1,state=$2,error_code=NULL,settled_at=CASE WHEN $2='succeeded' THEN COALESCE(settled_at,now()) ELSE settled_at END WHERE id=$3 RETURNING *",
      [result.id, state, r.id],
    );
    return updated;
  });
}
export async function returnStock(db: Database, actor: Actor, raw: unknown) {
  const input = z
    .object({
      orderId: z.uuid(),
      lineId: z.uuid(),
      quantity: z.number().int().positive().max(100),
      reason: z.string().trim().min(1).max(300),
      requestKey: z.uuid(),
    })
    .strict()
    .parse(raw);
  return db.transaction(async (tx) => {
    const o = await orderAccess(tx, actor, input.orderId, "refund", true);
    if (!["paid", "part_refunded", "refunded"].includes(o.status))
      throw new BookingError("Return requires a settled sale.");
    const [prior] = await tx.query(
      "SELECT * FROM reserve_returns WHERE actor_id=$1 AND request_key=$2",
      [actor.id, input.requestKey],
    );
    if (prior) {
      if (
        prior.line_id !== input.lineId ||
        prior.quantity !== input.quantity ||
        prior.reason !== input.reason
      )
        throw new BookingError("Return request already used.", 409);
      return { id: prior.id };
    }
    const [l] = await tx.query<Line>(
      "SELECT * FROM reserve_order_lines WHERE id=$1 AND order_id=$2 AND kind='product'",
      [input.lineId, o.id],
    );
    if (!l) throw new BookingError("Product line not found.", 404);
    const [count] = await tx.query<{ quantity: string }>(
      "SELECT COALESCE(sum(quantity),0)::text AS quantity FROM reserve_returns WHERE line_id=$1",
      [l.id],
    );
    if (Number(count.quantity) + input.quantity > l.quantity)
      throw new BookingError("Return exceeds the sold quantity.", 409);
    const id = randomUUID();
    await tx.query(
      "INSERT INTO reserve_returns(id,line_id,quantity,actor_id,reason,request_key) VALUES($1,$2,$3,$4,$5,$6)",
      [id, l.id, input.quantity, actor.id, input.reason, input.requestKey],
    );
    await tx.query(
      "UPDATE reserve_stock SET on_hand=on_hand+$1 WHERE location_id=$2 AND sku_id=$3",
      [input.quantity, o.location_id, l.sku_id],
    );
    await tx.query(
      "INSERT INTO reserve_stock_movements(id,location_id,sku_id,actor_id,order_id,delta,kind,reason,request_key) VALUES($1,$2,$3,$4,$5,$6,'return',$7,$8)",
      [
        randomUUID(),
        o.location_id,
        l.sku_id,
        actor.id,
        o.id,
        input.quantity,
        input.reason,
        `return:${id}`,
      ],
    );
    await audit(tx, actor.id, o, "stock_returned");
    return { id };
  });
}
export async function reconcileRefund(
  db: Database,
  actor: Actor,
  id: string,
  processor: Processor = stripeProcessor,
) {
  const [r] = await db.query<Refund>(
    "SELECT * FROM reserve_refunds WHERE id=$1",
    [id],
  );
  if (!r) throw new BookingError("Refund not found.", 404);
  await orderAccess(db, actor, r.order_id, "refund");
  const [p] = await db.query<Payment>(
    "SELECT * FROM reserve_payments WHERE order_id=$1",
    [r.order_id],
  );
  if (p.method === "cash" || r.state === "succeeded") return r;
  if (r.processor_id)
    return settleRefund(db, await processor.getRefund(r.processor_id));
  if (Date.now() - +new Date(String(r.created_at)) > 23 * 3600000)
    throw new BookingError(
      "Refund mapping requires processor investigation before retry.",
      409,
    );
  if (!p.payment_intent)
    throw new BookingError("Missing payment mapping.", 409);
  return settleRefund(db, await processor.refund(r, p.payment_intent));
}
