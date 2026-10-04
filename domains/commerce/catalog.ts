import { randomUUID } from "node:crypto";
import { z } from "zod";
import { BookingError, type Actor } from "../../lib/booking";
import type { Database, Queryable, Row } from "../../lib/db";
import { requireAccess, permitted } from "../access";
const key = z.string().min(1).max(100);
export const catalogSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("settings"),
      locationId: key,
      enabled: z.boolean(),
      taxBps: z.number().int().min(0).max(3000),
      serviceTaxable: z.boolean(),
      taxApproved: z.boolean(),
      taxNote: z.string().trim().max(300),
      revision: z.number().int().min(0),
    })
    .strict(),
  z
    .object({
      action: z.literal("sku"),
      locationId: key,
      id: key.optional(),
      sku: key,
      name: z.string().trim().min(1).max(100),
      description: z.string().max(500).default(""),
      price: z.number().int().min(0).max(1000000),
      taxable: z.boolean(),
      enabled: z.boolean(),
      revision: z.number().int().min(0).default(0),
    })
    .strict(),
  z
    .object({
      action: z.literal("adjust"),
      locationId: key,
      skuId: key,
      delta: z
        .number()
        .int()
        .min(-100000)
        .max(100000)
        .refine((v) => v !== 0),
      reason: z.string().trim().min(1).max(300),
      requestKey: z.uuid(),
    })
    .strict(),
]);
export async function catalog(db: Queryable, actor: Actor, locationId: string) {
  requireAccess(actor, "checkout", locationId);
  const [settings] = await db.query(
    "SELECT * FROM reserve_commerce_settings WHERE location_id=$1",
    [locationId],
  );
  const skus = await db.query(
    `SELECT s.*,COALESCE(t.on_hand,0) AS on_hand,COALESCE(t.reserved,0) AS reserved FROM reserve_skus s JOIN reserve_locations l ON l.organization_id=s.organization_id LEFT JOIN reserve_stock t ON t.sku_id=s.id AND t.location_id=l.id WHERE l.id=$1 ORDER BY s.name`,
    [locationId],
  );
  return {
    settings: settings || null,
    skus,
    canManage: permitted(actor, "inventory", locationId),
    canRefund: permitted(actor, "refund", locationId),
    canDiscount: permitted(actor, "discount", locationId),
  };
}
export async function configureCommerce(
  db: Database,
  actor: Actor,
  raw: unknown,
) {
  const input = catalogSchema.parse(raw);
  requireAccess(actor, "inventory", input.locationId);
  return db.transaction(async (tx) => {
    const [location] = await tx.query<{ organization_id: string }>(
      "SELECT organization_id FROM reserve_locations WHERE id=$1 FOR UPDATE",
      [input.locationId],
    );
    if (!location) throw new BookingError("Location not found.", 404);
    let id: string = input.locationId;
    if (input.action === "settings") {
      requireAccess(actor, "grant", input.locationId);
      if (input.enabled && (!input.taxApproved || !input.taxNote))
        throw new BookingError(
          "Approve and document the tax configuration before enabling commerce.",
        );
      const rows = await tx.query(
        `INSERT INTO reserve_commerce_settings(location_id,enabled,tax_bps,service_taxable,tax_approved,tax_note) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(location_id) DO UPDATE SET enabled=$2,tax_bps=$3,service_taxable=$4,tax_approved=$5,tax_note=$6,revision=reserve_commerce_settings.revision+1 WHERE reserve_commerce_settings.revision=$7 RETURNING location_id`,
        [
          input.locationId,
          input.enabled,
          input.taxBps,
          input.serviceTaxable,
          input.taxApproved,
          input.taxNote,
          input.revision,
        ],
      );
      if (!rows.length)
        throw new BookingError("Commerce settings changed. Reload.", 409);
    } else if (input.action === "sku") {
      requireAccess(actor, "grant", input.locationId);
      id = input.id || randomUUID();
      const rows = await tx.query(
        `INSERT INTO reserve_skus(id,organization_id,sku,name,description,price,taxable,enabled) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO UPDATE SET sku=$3,name=$4,description=$5,price=$6,taxable=$7,enabled=$8,revision=reserve_skus.revision+1 WHERE reserve_skus.organization_id=$2 AND reserve_skus.revision=$9 RETURNING id`,
        [
          id,
          location.organization_id,
          input.sku,
          input.name,
          input.description,
          input.price,
          input.taxable,
          input.enabled,
          input.revision,
        ],
      );
      if (!rows.length)
        throw new BookingError("Product changed or unavailable. Reload.", 409);
    } else {
      const [prior] = await tx.query<Row>(
        "SELECT * FROM reserve_stock_movements WHERE actor_id=$1 AND request_key=$2",
        [actor.id, input.requestKey],
      );
      if (prior) {
        if (
          prior.location_id !== input.locationId ||
          prior.sku_id !== input.skuId ||
          prior.delta !== input.delta ||
          prior.reason !== input.reason ||
          prior.kind !== "adjust"
        )
          throw new BookingError("Stock request already used.", 409);
        return { id: prior.id };
      }
      await tx.query(
        "INSERT INTO reserve_stock(location_id,sku_id,organization_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
        [input.locationId, input.skuId, location.organization_id],
      );
      const rows = await tx.query(
        "UPDATE reserve_stock SET on_hand=on_hand+$1 WHERE location_id=$2 AND sku_id=$3 AND on_hand+$1>=reserved RETURNING sku_id",
        [input.delta, input.locationId, input.skuId],
      );
      if (!rows.length)
        throw new BookingError("Adjustment would consume reserved stock.", 409);
      id = randomUUID();
      await tx.query(
        "INSERT INTO reserve_stock_movements(id,location_id,sku_id,actor_id,delta,kind,reason,request_key) VALUES($1,$2,$3,$4,$5,'adjust',$6,$7)",
        [
          id,
          input.locationId,
          input.skuId,
          actor.id,
          input.delta,
          input.reason,
          input.requestKey,
        ],
      );
    }
    await tx.query(
      "INSERT INTO reserve_operation_events(actor_id,location_id,entity_id,action) VALUES($1,$2,$3,$4)",
      [actor.id, input.locationId, id, `commerce_${input.action}`],
    );
    return { id };
  });
}
