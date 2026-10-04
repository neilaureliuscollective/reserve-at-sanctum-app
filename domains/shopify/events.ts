import { createHmac, timingSafeEqual } from "node:crypto";
import { BookingError } from "../../lib/booking";
import type { Database } from "../../lib/db";
import { importOrder, type Mapping } from "./index";
import { shopDomain, shopifyClient, type ShopifyClient } from "./client";
export type ShopifyEvent = {
  shop: string;
  id: string;
  topic: string;
  orderId: string;
};
const topics = new Set([
  "orders/create",
  "orders/paid",
  "orders/updated",
  "orders/cancelled",
  "refunds/create",
]);
export function verifyShopify(
  raw: Buffer,
  headers: Headers,
  secret: string,
): ShopifyEvent {
  const signature = headers.get("x-shopify-hmac-sha256") || "";
  const expected = createHmac("sha256", secret).update(raw).digest();
  if (!/^[A-Za-z0-9+/]{43}=$/.test(signature))
    throw new BookingError("Invalid Shopify signature.", 400);
  const provided = Buffer.from(signature, "base64");
  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  )
    throw new BookingError("Invalid Shopify signature.", 400);
  const shop = headers.get("x-shopify-shop-domain") || "",
    topic = headers.get("x-shopify-topic") || "",
    id = headers.get("x-shopify-webhook-id") || "";
  if (
    shop !== shopDomain() ||
    !topics.has(topic) ||
    !/^[a-zA-Z0-9-]{1,100}$/.test(id)
  )
    throw new BookingError("Unexpected Shopify delivery.", 400);
  // Preserve large Shopify IDs: prefer GraphQL ID; otherwise quote numeric ID tokens before parsing.
  const payload = JSON.parse(
    raw
      .toString("utf8")
      .replace(/("(?:id|order_id)"\s*:\s*)(\d+)(?=\s*[,}])/g, '$1"$2"'),
  );
  const numeric = topic === "refunds/create" ? payload.order_id : payload.id;
  const orderId =
    topic !== "refunds/create" &&
    typeof payload.admin_graphql_api_id === "string"
      ? payload.admin_graphql_api_id
      : `gid://shopify/Order/${numeric}`;
  if (!/^gid:\/\/shopify\/Order\/\d+$/.test(orderId))
    throw new BookingError("Invalid Shopify order mapping.", 400);
  return { shop, id, topic, orderId };
}
export async function ingestShopify(db: Database, e: ShopifyEvent) {
  await db.query(
    "INSERT INTO reserve_shopify_events(shop_domain,event_id,topic,shopify_order_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
    [e.shop, e.id, e.topic, e.orderId],
  );
}
export async function processShopifyEvents(
  db: Database,
  client: ShopifyClient = shopifyClient,
) {
  const events = await db.query<{
    shop_domain: string;
    event_id: string;
    shopify_order_id: string;
  }>(
    "SELECT shop_domain,event_id,shopify_order_id FROM reserve_shopify_events WHERE state IN ('pending','failed') AND attempts<10 AND due_at<=now() ORDER BY received_at LIMIT 2",
  );
  const results: { id: string; state: string }[] = [];
  for (const event of events) {
    try {
      await db.query(
        "UPDATE reserve_shopify_events SET attempts=attempts+1 WHERE shop_domain=$1 AND event_id=$2 AND state<>'processed'",
        [event.shop_domain, event.event_id],
      );
      if (event.shop_domain !== shopDomain())
        throw new BookingError("Store mapping changed.", 409);
      const remote = await client.order(event.shopify_order_id);
      const [m] = await db.query<Mapping>(
        "SELECT * FROM reserve_shopify_locations WHERE shop_domain=$1 AND shopify_location_id=$2 AND enabled=true",
        [event.shop_domain, remote.retailLocation?.id || ""],
      );
      if (remote.sourceName !== "pos" || !m) {
        await db.query(
          "UPDATE reserve_shopify_events SET state='unmapped',error_code='not_mapped_pos',processed_at=now() WHERE shop_domain=$1 AND event_id=$2 AND state<>'processed'",
          [event.shop_domain, event.event_id],
        );
        results.push({ id: event.event_id, state: "unmapped" });
        continue;
      }
      await importOrder(db, m.location_id, event.shopify_order_id, client);
      await db.query(
        "UPDATE reserve_shopify_events SET state='processed',error_code=NULL,processed_at=now() WHERE shop_domain=$1 AND event_id=$2",
        [event.shop_domain, event.event_id],
      );
      results.push({ id: event.event_id, state: "processed" });
    } catch {
      await db.query(
        "UPDATE reserve_shopify_events SET state='failed',error_code='canonical_reconciliation_failed',due_at=now()+interval '5 minutes' WHERE shop_domain=$1 AND event_id=$2 AND state<>'processed'",
        [event.shop_domain, event.event_id],
      );
      results.push({ id: event.event_id, state: "failed" });
    }
  }
  return results;
}
/** Repair missed webhooks by revisiting the oldest synced active-location records each worker run. */
export async function reconcileImported(
  db: Database,
  client: ShopifyClient = shopifyClient,
) {
  const rows = await db.query<{
    location_id: string;
    shopify_order_id: string;
  }>(
    "SELECT o.location_id,o.shopify_order_id FROM reserve_shopify_orders o JOIN reserve_shopify_locations m ON m.location_id=o.location_id AND m.shop_domain=o.shop_domain WHERE m.enabled=true AND m.shop_domain=$1 ORDER BY o.checked_at LIMIT 2",
    [shopDomain()],
  );
  let refreshed = 0;
  for (const row of rows) {
    await db.query(
      "UPDATE reserve_shopify_orders SET checked_at=now() WHERE location_id=$1 AND shopify_order_id=$2",
      [row.location_id, row.shopify_order_id],
    );
    try {
      await importOrder(db, row.location_id, row.shopify_order_id, client);
      refreshed++;
    } catch {
      /* Preserve last successful sync time; continue so one unavailable order cannot starve others. */
    }
  }
  return { refreshed, attempted: rows.length };
}

/** Durable bounded backfill: save cursor only after every order on the page has been imported. */
export async function discoverSales(
  db: Database,
  client: ShopifyClient = shopifyClient,
) {
  const locations = await db.query<
    Mapping & {
      scan_from: string | Date | null;
      scan_until: string | Date | null;
      scan_cursor: string | null;
    }
  >(
    "SELECT * FROM reserve_shopify_locations WHERE enabled=true AND shop_domain=$1 ORDER BY scan_checked_at NULLS FIRST LIMIT 1",
    [shopDomain()],
  );
  let imported = 0;
  for (const m of locations) {
    const { from, until, cursor } = await db.transaction(async (tx) => {
      const [current] = await tx.query<
        Mapping & {
          scan_from: string | Date | null;
          scan_until: string | Date | null;
          scan_cursor: string | null;
        }
      >(
        "SELECT * FROM reserve_shopify_locations WHERE location_id=$1 FOR UPDATE",
        [m.location_id],
      );
      if (!current?.enabled || current.shop_domain !== m.shop_domain)
        throw new BookingError("Shopify mapping changed.", 409);
      const from = current.scan_from
        ? new Date(current.scan_from).toISOString()
        : new Date(Date.now() - 48 * 3600000).toISOString();
      const until = current.scan_until
        ? new Date(current.scan_until).toISOString()
        : new Date().toISOString();
      await tx.query(
        "UPDATE reserve_shopify_locations SET scan_from=$1,scan_until=$2,scan_checked_at=now() WHERE location_id=$3",
        [from, until, m.location_id],
      );
      return { from, until, cursor: current.scan_cursor };
    });
    const page = await client.recent(
      m.shopify_location_id,
      cursor || undefined,
      { from, until },
    );
    for (const o of page.nodes) {
      await importOrder(db, m.location_id, o.id, client);
      imported++;
    }
    if (page.pageInfo.hasNextPage && !page.pageInfo.endCursor)
      throw new BookingError("Shopify backfill cursor is missing.", 503);
    await db.query(
      "UPDATE reserve_shopify_locations SET scan_from=$1,scan_until=$2,scan_cursor=$3,scan_checked_at=now() WHERE location_id=$4 AND enabled=true",
      [
        page.pageInfo.hasNextPage
          ? from
          : new Date(Date.parse(until) - 600000).toISOString(),
        page.pageInfo.hasNextPage ? until : null,
        page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null,
        m.location_id,
      ],
    );
  }
  return { imported };
}
