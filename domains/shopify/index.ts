import { randomUUID } from "node:crypto";
import { z } from "zod";
import { BookingError, type Actor, type Appointment } from "../../lib/booking";
import type { Database, Queryable, Row } from "../../lib/db";
import { requireAccess, permitted } from "../access";
import {
  cents,
  locationPattern,
  shopDomain,
  shopifyClient,
  type ShopifyClient,
  type RemoteOrder,
} from "./client";
export type Mapping = Row & {
  location_id: string;
  shop_domain: string;
  shopify_location_id: string;
  enabled: boolean;
};
export type Sale = Row & {
  id: string;
  shopify_order_id: string;
  location_id: string;
  name: string;
  financial_status: string;
  total: number;
  received: number;
  refunded: number;
  source: string;
  test: boolean;
  cancelled: boolean;
  lines: { id: string; name: string; quantity: number }[];
  shop_updated_at: string | Date;
  processed_at: string | Date;
  synced_at: string | Date;
  appointment_id: string | null;
  customer_id: string | null;
};
export async function mapping(db: Queryable, location: string, active = true) {
  const [m] = await db.query<Mapping>(
    "SELECT * FROM reserve_shopify_locations WHERE location_id=$1",
    [location],
  );
  if (!m || m.shop_domain !== shopDomain() || (active && !m.enabled))
    throw new BookingError(
      "This Reserve location has not been connected to Shopify.",
      409,
    );
  return m;
}
export async function configureShopify(
  db: Database,
  actor: Actor,
  raw: unknown,
  client: ShopifyClient = shopifyClient,
) {
  const input = z
    .object({
      locationId: z.string().min(1).max(100),
      shopifyLocationId: z.string().regex(locationPattern),
      enabled: z.boolean(),
    })
    .strict()
    .parse(raw);
  requireAccess(actor, "grant", input.locationId);
  const domain = shopDomain();
  const locations = await client.locations();
  const chosen = locations.nodes.find(
    (l) => l.id === input.shopifyLocationId && l.isActive,
  );
  if (!chosen)
    throw new BookingError(
      "Select an active location returned by your Shopify store.",
      409,
    );
  return db.transaction(async (tx) => {
    const [location] = await tx.query(
      "SELECT id FROM reserve_locations WHERE id=$1 FOR UPDATE",
      [input.locationId],
    );
    if (!location) throw new BookingError("Reserve location not found.", 404);
    const [unresolved] = await tx.query(
      "SELECT id FROM reserve_orders WHERE location_id=$1 AND status IN ('draft','pending') LIMIT 1",
      [input.locationId],
    );
    const [held] = await tx.query(
      "SELECT sku_id FROM reserve_stock WHERE location_id=$1 AND reserved>0 LIMIT 1",
      [input.locationId],
    );
    if (input.enabled && (unresolved || held))
      throw new BookingError(
        "Reconcile all previous register drafts, pending payments and held stock before connecting Shopify.",
        409,
      );
    const [old] = await tx.query<Mapping>(
      "SELECT * FROM reserve_shopify_locations WHERE location_id=$1 FOR UPDATE",
      [input.locationId],
    );
    if (
      old &&
      (old.shop_domain !== domain ||
        old.shopify_location_id !== input.shopifyLocationId)
    ) {
      const [history] = await tx.query(
        "SELECT id FROM reserve_shopify_orders WHERE location_id=$1 LIMIT 1",
        [input.locationId],
      );
      if (history)
        throw new BookingError(
          "A location with imported sales cannot be remapped. Create the next Reserve location instead.",
          409,
        );
    }
    await tx.query(
      "INSERT INTO reserve_shopify_locations(location_id,shop_domain,shopify_location_id,enabled) VALUES($1,$2,$3,$4) ON CONFLICT(location_id) DO UPDATE SET shop_domain=$2,shopify_location_id=$3,enabled=$4,verified_at=now()",
      [input.locationId, domain, input.shopifyLocationId, input.enabled],
    );
    await tx.query(
      "UPDATE reserve_commerce_settings SET enabled=false,revision=revision+1 WHERE location_id=$1",
      [input.locationId],
    );
    await tx.query(
      "INSERT INTO reserve_operation_events(actor_id,location_id,entity_id,action) VALUES($1,$2,$2,'shopify_location_configured')",
      [actor.id, input.locationId],
    );
    return { name: chosen.name };
  });
}
export function normalizeOrder(o: RemoteOrder, m: Mapping) {
  if (
    !o.id.match(/^gid:\/\/shopify\/Order\/\d+$/) ||
    o.sourceName !== "pos" ||
    o.retailLocation?.id !== m.shopify_location_id
  )
    throw new BookingError(
      "Only POS orders from this exact Shopify location can be imported here.",
      409,
    );
  if (
    !Number.isFinite(Date.parse(o.updatedAt)) ||
    !Number.isFinite(Date.parse(o.processedAt))
  )
    throw new BookingError("Shopify order timestamps require review.", 409);
  if (o.lineItems.pageInfo.hasNextPage)
    throw new BookingError(
      "This large order needs manual review; its receipt was not truncated.",
      409,
    );
  return {
    total: cents(o.totalPriceSet),
    received: cents(o.totalReceivedSet),
    refunded: cents(o.totalRefundedSet),
  };
}
export async function importOrder(
  db: Database,
  location: string,
  id: string,
  client: ShopifyClient = shopifyClient,
) {
  const m = await mapping(db, location);
  const remote = await client.order(id);
  if (remote.id !== id)
    throw new BookingError("Shopify returned a different order.", 409);
  const amounts = normalizeOrder(remote, m);
  return db.transaction(async (tx) => {
    // Serialize imports/remapping for this location; remote versions prevent stale network responses from regressing state.
    const [current] = await tx.query<Mapping>(
      "SELECT * FROM reserve_shopify_locations WHERE location_id=$1 FOR UPDATE",
      [location],
    );
    if (
      !current?.enabled ||
      current.shop_domain !== m.shop_domain ||
      current.shopify_location_id !== m.shopify_location_id
    )
      throw new BookingError("Shopify connection changed. Retry.", 409);
    const [prior] = await tx.query<Sale>(
      "SELECT * FROM reserve_shopify_orders WHERE shop_domain=$1 AND shopify_order_id=$2 FOR UPDATE",
      [m.shop_domain, id],
    );
    if (
      prior &&
      +new Date(prior.shop_updated_at) > Date.parse(remote.updatedAt)
    )
      return prior;
    const [sale] = await tx.query<Sale>(
      `INSERT INTO reserve_shopify_orders(id,shop_domain,shopify_order_id,location_id,name,financial_status,currency,total,received,refunded,source,test,cancelled,lines,shop_updated_at,processed_at) VALUES($1,$2,$3,$4,$5,$6,'USD',$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT(shop_domain,shopify_order_id) DO UPDATE SET name=EXCLUDED.name,financial_status=EXCLUDED.financial_status,total=EXCLUDED.total,received=EXCLUDED.received,refunded=EXCLUDED.refunded,test=EXCLUDED.test,cancelled=EXCLUDED.cancelled,lines=EXCLUDED.lines,shop_updated_at=EXCLUDED.shop_updated_at,processed_at=EXCLUDED.processed_at,synced_at=now() RETURNING *`,
      [
        randomUUID(),
        m.shop_domain,
        id,
        location,
        remote.name,
        remote.displayFinancialStatus,
        amounts.total,
        amounts.received,
        amounts.refunded,
        remote.sourceName,
        remote.test,
        Boolean(remote.cancelledAt),
        JSON.stringify(remote.lineItems.nodes),
        remote.updatedAt,
        remote.processedAt,
      ],
    );
    // Never adjust Reserve stock, issue a payment, or complete an appointment from an imported order.
    return sale;
  });
}
export async function syncRecent(
  db: Database,
  actor: Actor,
  location: string,
  after?: string,
  client: ShopifyClient = shopifyClient,
) {
  requireAccess(actor, "checkout", location);
  const m = await mapping(db, location);
  const page = await client.recent(m.shopify_location_id, after);
  const imported: Sale[] = [];
  for (const o of page.nodes)
    imported.push(await importOrder(db, location, o.id, client));
  return { imported: imported.length, ...page.pageInfo };
}
export async function linkSale(
  db: Database,
  actor: Actor,
  raw: unknown,
  client: ShopifyClient = shopifyClient,
) {
  const input = z
    .object({
      locationId: z.string().min(1).max(100),
      saleId: z.uuid(),
      appointmentId: z.uuid(),
      reason: z.string().trim().min(1).max(300),
    })
    .strict()
    .parse(raw);
  requireAccess(actor, "checkout", input.locationId);
  const [existing] = await db.query<Sale>(
    "SELECT * FROM reserve_shopify_orders WHERE id=$1 AND location_id=$2",
    [input.saleId, input.locationId],
  );
  if (!existing) throw new BookingError("Sale not found.", 404);
  await importOrder(db, input.locationId, existing.shopify_order_id, client);
  return db.transaction(async (tx) => {
    const [appointment] = await tx.query<Appointment>(
      "SELECT * FROM reserve_appointments WHERE id=$1 FOR UPDATE",
      [input.appointmentId],
    );
    if (!appointment || appointment.location_id !== input.locationId)
      throw new BookingError("Visit not found in this location.", 404);
    const [sale] = await tx.query<Sale>(
      "SELECT * FROM reserve_shopify_orders WHERE id=$1 FOR UPDATE",
      [input.saleId],
    );
    if (sale.appointment_id) {
      if (sale.appointment_id === input.appointmentId) return sale;
      throw new BookingError("Sale is already linked to another visit.", 409);
    }
    if (
      sale.test ||
      sale.cancelled ||
      !["PAID", "PARTIALLY_REFUNDED"].includes(sale.financial_status) ||
      Number(sale.received) <= 0
    )
      throw new BookingError(
        "Only a verified, paid, non-test POS sale can be linked to a visit.",
        409,
      );
    if (!["checked_in", "completed"].includes(appointment.status))
      throw new BookingError(
        "Check in or complete the visit before linking its sale.",
        409,
      );
    const [collision] = await tx.query(
      `SELECT id FROM reserve_orders WHERE appointment_id=$1 AND status<>'void' UNION ALL SELECT id FROM reserve_external_collections WHERE appointment_id=$1 AND reversed_by IS NULL UNION ALL SELECT id FROM reserve_shopify_orders WHERE appointment_id=$1`,
      [appointment.id],
    );
    if (collision)
      throw new BookingError(
        "This visit already has a payment record. Review it before linking another sale.",
        409,
      );
    const [result] = await tx.query<Sale>(
      "UPDATE reserve_shopify_orders SET appointment_id=$1,customer_id=$2,linked_by=$3,link_reason=$4,linked_at=now() WHERE id=$5 RETURNING *",
      [
        appointment.id,
        appointment.customer_id,
        actor.id,
        input.reason,
        input.saleId,
      ],
    );
    await tx.query(
      "INSERT INTO reserve_shopify_link_history(sale_id,appointment_id,actor_id,action,reason) VALUES($1,$2,$3,'link',$4)",
      [input.saleId, appointment.id, actor.id, input.reason],
    );
    await tx.query(
      "INSERT INTO reserve_operation_events(actor_id,location_id,entity_id,action) VALUES($1,$2,$3,'shopify_sale_linked')",
      [actor.id, input.locationId, input.saleId],
    );
    return result;
  });
}
export async function sales(db: Queryable, actor: Actor, location: string) {
  requireAccess(actor, "checkout", location);
  return db.query<Sale>(
    "SELECT * FROM reserve_shopify_orders WHERE location_id=$1 ORDER BY processed_at DESC,id LIMIT 100",
    [location],
  );
}
export async function saleReceipt(db: Queryable, actor: Actor, id: string) {
  const [sale] = await db.query<Sale>(
    "SELECT o.*,l.timezone FROM reserve_shopify_orders o JOIN reserve_locations l ON l.id=o.location_id WHERE o.id=$1",
    [id],
  );
  if (!sale) throw new BookingError("Receipt not found.", 404);
  if (!permitted(actor, "checkout", sale.location_id)) {
    const [customer] = await db.query(
      "SELECT id FROM reserve_customers WHERE id=$1 AND auth_user_id=$2",
      [sale.customer_id, actor.id],
    );
    if (!customer) throw new BookingError("Receipt not found.", 404);
  }
  // No customer email, addresses, order status access token, notes, or Shopify private payload.
  return {
    id: sale.id,
    name: sale.name,
    total: Number(sale.total),
    received: Number(sale.received),
    refunded: Number(sale.refunded),
    financial_status: sale.financial_status,
    lines: sale.lines,
    test: sale.test,
    cancelled: sale.cancelled,
    processed_at: sale.processed_at,
    synced_at: sale.synced_at,
    timezone: String(sale.timezone || "America/Chicago"),
  };
}
export async function customerSales(db: Queryable, actor: Actor) {
  return db.query<{ id: string; name: string; financial_status: string }>(
    "SELECT o.id,o.name,o.financial_status FROM reserve_shopify_orders o JOIN reserve_customers c ON c.id=o.customer_id WHERE c.auth_user_id=$1 ORDER BY o.processed_at DESC LIMIT 100",
    [actor.id],
  );
}

export async function unlinkSale(db: Database, actor: Actor, raw: unknown) {
  const input = z
    .object({
      locationId: z.string().min(1).max(100),
      saleId: z.uuid(),
      reason: z.string().trim().min(1).max(300),
    })
    .strict()
    .parse(raw);
  requireAccess(actor, "refund", input.locationId);
  return db.transaction(async (tx) => {
    const [sale] = await tx.query<Sale>(
      "SELECT * FROM reserve_shopify_orders WHERE id=$1 AND location_id=$2 FOR UPDATE",
      [input.saleId, input.locationId],
    );
    if (!sale) throw new BookingError("Sale not found.", 404);
    if (!sale.appointment_id) return { corrected: true };
    await tx.query(
      "INSERT INTO reserve_shopify_link_history(sale_id,appointment_id,actor_id,action,reason) VALUES($1,$2,$3,'unlink',$4)",
      [sale.id, sale.appointment_id, actor.id, input.reason],
    );
    await tx.query(
      "UPDATE reserve_shopify_orders SET appointment_id=NULL,customer_id=NULL,linked_by=NULL,link_reason=NULL,linked_at=NULL WHERE id=$1",
      [sale.id],
    );
    return { corrected: true };
  });
}
