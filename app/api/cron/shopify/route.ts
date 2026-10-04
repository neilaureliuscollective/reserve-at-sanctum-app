import { timingSafeEqual } from "node:crypto";
import { database } from "@/lib/db";
import {
  processShopifyEvents,
  reconcileImported,
  discoverSales,
} from "@/domains/shopify/events";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function POST(req: Request) {
  const secret = process.env.RESERVE_CRON_SECRET,
    provided = Buffer.from(req.headers.get("authorization") || ""),
    expected = Buffer.from(`Bearer ${secret}`);
  if (
    !secret ||
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = await database();
    return Response.json({
      events: await processShopifyEvents(db),
      recovery: await reconcileImported(db),
      backfill: await discoverSales(db),
    });
  } catch {
    return Response.json(
      { error: "Shopify worker unavailable" },
      { status: 503 },
    );
  }
}
