import { z } from "zod";
import { authenticated, rateLimit } from "@/lib/operation-http";
import { failure, mutationOrigin } from "@/lib/http";
import { readChairJson } from "@/lib/chair-http";
import { catalog, configureCommerce } from "@/domains/commerce/catalog";
import {
  createOrder,
  cashPayment,
  voidDraft,
  orders,
  receipt,
  openOrders,
  dailyMoney,
  ownReceipts,
} from "@/domains/commerce/orders";
import {
  beginCardPayment,
  reconcilePayment,
} from "@/domains/commerce/payments";
import {
  refundOrder,
  returnStock,
  reconcileRefund,
} from "@/domains/commerce/refunds";
import { processorAvailable } from "@/domains/commerce/stripe";
import { requireAccess } from "@/domains/access";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const { db, actor } = await authenticated();
    const p = new URL(req.url).searchParams;
    if (p.get("customer") === "true")
      return Response.json({ orders: await ownReceipts(db, actor) });
    if (p.get("order"))
      return Response.json(await receipt(db, actor, p.get("order")!));
    const location = p.get("location") || "";
    const result = await catalog(db, actor, location);
    return Response.json({
      ...result,
      processorConfigured: processorAvailable(),
      openOrders: await openOrders(db, actor, location),
      dailyMoney: p.get("date")
        ? await dailyMoney(db, actor, location, p.get("date")!)
        : [],
      orders: p.get("date")
        ? await orders(db, actor, location, p.get("date")!)
        : [],
      events: result.canManage
        ? await db.query(
            "SELECT e.* FROM reserve_payment_events e LEFT JOIN reserve_orders o ON o.id=e.order_id WHERE e.state='failed' AND (o.location_id=$1 OR (e.order_id IS NULL AND $2::boolean)) ORDER BY e.created_at LIMIT 50",
            [
              location,
              Boolean(actor.assignments?.some((a) => a.role === "owner")),
            ],
          )
        : [],
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    mutationOrigin(req);
    const { db, actor } = await authenticated();
    await rateLimit(`commerce:${actor.id}`, 40);
    const body = z
      .object({ action: z.string(), input: z.unknown() })
      .strict()
      .parse(await readChairJson(req, 16000));
    if (body.action === "configure")
      return Response.json(await configureCommerce(db, actor, body.input));
    if (body.action === "order")
      return Response.json({ order: await createOrder(db, actor, body.input) });
    if (body.action === "refund")
      return Response.json({
        refund: await refundOrder(db, actor, body.input),
      });
    if (body.action === "return")
      return Response.json(await returnStock(db, actor, body.input));
    const input = z
      .object({
        id: z.uuid(),
        revision: z.number().int().positive().optional(),
      })
      .strict()
      .parse(body.input);
    if (body.action === "refund_reconcile")
      return Response.json({
        refund: await reconcileRefund(db, actor, input.id),
      });
    if (body.action === "cash")
      return Response.json({
        order: await cashPayment(db, actor, input.id, input.revision || 0),
      });
    if (body.action === "void")
      return Response.json({
        order: await voidDraft(db, actor, input.id, input.revision || 0),
      });
    if (body.action === "card")
      return Response.json(
        await beginCardPayment(db, actor, input.id, input.revision || 0),
      );
    if (body.action === "reconcile" || body.action === "expire")
      return Response.json({
        order: await reconcilePayment(
          db,
          actor,
          input.id,
          body.action === "expire",
        ),
      });
    throw Error("Unknown commerce action");
  } catch (e) {
    return failure(e);
  }
}
