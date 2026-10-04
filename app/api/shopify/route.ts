import { z } from "zod";
import { authenticated, rateLimit } from "@/lib/operation-http";
import { failure, mutationOrigin } from "@/lib/http";
import { readChairJson } from "@/lib/chair-http";
import { requireAccess, permitted } from "@/domains/access";
import {
  configureShopify,
  mapping,
  sales,
  importOrder,
  linkSale,
  unlinkSale,
  syncRecent,
  saleReceipt,
  customerSales,
} from "@/domains/shopify";
import {
  shopifyConfigured,
  shopifyClient,
  orderPattern,
} from "@/domains/shopify/client";
import { BookingError } from "@/lib/booking";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const { db, actor } = await authenticated(),
      p = new URL(req.url).searchParams;
    if (p.get("receipt"))
      return Response.json(await saleReceipt(db, actor, p.get("receipt")!));
    if (p.get("customer") === "true")
      return Response.json({ sales: await customerSales(db, actor) });
    const location = p.get("location") || "";
    requireAccess(actor, "checkout", location);
    if (p.get("setup") === "true") {
      requireAccess(actor, "grant", location);
      return Response.json({ locations: await shopifyClient.locations() });
    }
    const [connection] = await db.query(
      "SELECT location_id,shop_domain,shopify_location_id,enabled,verified_at FROM reserve_shopify_locations WHERE location_id=$1",
      [location],
    );
    if (p.get("inventory") === "true") {
      const m = await mapping(db, location);
      return Response.json({
        inventory: await shopifyClient.inventory(
          m.shopify_location_id,
          p.get("cursor") || undefined,
        ),
        observedAt: new Date().toISOString(),
      });
    }
    return Response.json({
      configured: shopifyConfigured(),
      connection: connection
        ? {
            location_id: connection.location_id,
            shopify_location_id: connection.shopify_location_id,
            verified_at: connection.verified_at,
            enabled: Boolean(
              connection.enabled &&
                connection.shop_domain === process.env.SHOPIFY_SHOP_DOMAIN,
            ),
          }
        : null,
      canConfigure: permitted(actor, "grant", location),
      canCorrect: permitted(actor, "refund", location),
      sales: await sales(db, actor, location),
      events: permitted(actor, "grant", location)
        ? await db.query(
            "SELECT event_id,topic,state,attempts,error_code,received_at FROM reserve_shopify_events WHERE state IN ('failed','unmapped') ORDER BY received_at DESC LIMIT 50",
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
    await rateLimit(`shopify:${actor.id}`, 20);
    const body = z
      .object({
        action: z.enum(["configure", "sync", "import", "link", "unlink"]),
        input: z.unknown(),
      })
      .strict()
      .parse(await readChairJson(req, 16000));
    if (body.action === "configure")
      return Response.json(await configureShopify(db, actor, body.input));
    if (body.action === "unlink")
      return Response.json(await unlinkSale(db, actor, body.input));
    if (body.action === "link")
      return Response.json({ sale: await linkSale(db, actor, body.input) });
    const input = z
      .object({
        locationId: z.string().min(1).max(100),
        orderId: z.string().regex(orderPattern).optional(),
        cursor: z.string().max(1000).optional(),
      })
      .strict()
      .parse(body.input);
    requireAccess(actor, "checkout", input.locationId);
    if (body.action === "sync")
      return Response.json(
        await syncRecent(db, actor, input.locationId, input.cursor),
      );
    if (!input.orderId)
      throw new BookingError("Enter the Shopify order ID.", 400);
    return Response.json({
      sale: await importOrder(db, input.locationId, input.orderId),
    });
  } catch (e) {
    return failure(e);
  }
}
