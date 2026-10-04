import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Database, Queryable } from "../../lib/db";
import { BookingError, type Actor, type Appointment } from "../../lib/booking";
import { requireAccess } from "../access";
export const collectionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("record"),
      appointmentId: z.uuid(),
      amount: z.number().int().positive().max(1000000),
      method: z.enum(["cash", "external"]),
      reference: z.string().trim().max(160).default(""),
      requestKey: z.uuid(),
    })
    .strict(),
  z
    .object({
      action: z.literal("reverse"),
      id: z.uuid(),
      reason: z.string().trim().min(1).max(160),
    })
    .strict(),
]);
export async function collect(db: Database, actor: Actor, raw: unknown) {
  const input = collectionSchema.parse(raw);
  return db.transaction(async (tx) => {
    const [a] = await tx.query<Appointment>(
      "SELECT a.* FROM reserve_appointments a LEFT JOIN reserve_external_collections c ON c.appointment_id=a.id WHERE " +
        (input.action === "record" ? "a.id=$1" : "c.id=$1") +
        " FOR UPDATE OF a",
      [input.action === "record" ? input.appointmentId : input.id],
    );
    if (!a) throw new BookingError("Visit not found.", 404);
    requireAccess(
      actor,
      "collect",
      a.location_id,
      undefined,
      a.organization_id,
    );
    let id: string;
    if (input.action === "record") {
      const [order] = await tx.query(
        "SELECT id FROM reserve_orders WHERE appointment_id=$1 AND status<>'void' UNION ALL SELECT id FROM reserve_shopify_orders WHERE appointment_id=$1",
        [a.id],
      );
      if (order)
        throw new BookingError(
          "This visit has a commerce order. Collect and reconcile through that order.",
          409,
        );
      if (input.method === "external" && !input.reference)
        throw new BookingError("Enter the external receipt reference.");
      const [prior] = await tx.query<{
        id: string;
        appointment_id: string;
        amount: number;
        method: string;
        reference: string;
      }>(
        "SELECT * FROM reserve_external_collections WHERE created_by=$1 AND request_key=$2",
        [actor.id, input.requestKey],
      );
      if (prior) {
        if (
          prior.appointment_id !== a.id ||
          prior.amount !== input.amount ||
          prior.method !== input.method ||
          prior.reference !== input.reference
        )
          throw new BookingError("This receipt request was already used.", 409);
        return { id: prior.id };
      }
      if (a.status === "cancelled" || a.status === "no_show")
        throw new BookingError(
          "This bridge records service collections for attended or active visits only.",
        );
      id = randomUUID();
      await tx.query(
        "INSERT INTO reserve_external_collections(id,appointment_id,location_id,amount,method,reference,created_by,request_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
        [
          id,
          a.id,
          a.location_id,
          input.amount,
          input.method,
          input.reference,
          actor.id,
          input.requestKey,
        ],
      );
    } else {
      id = input.id;
      const rows = await tx.query(
        "UPDATE reserve_external_collections SET reversed_by=$1,reversal_reason=$2 WHERE id=$3 AND reversed_by IS NULL RETURNING id",
        [actor.id, input.reason, id],
      );
      if (!rows.length)
        throw new BookingError("This receipt was already reversed.", 409);
    }
    await tx.query(
      "INSERT INTO reserve_operation_events(actor_id,location_id,entity_id,action) VALUES($1,$2,$3,$4)",
      [
        actor.id,
        a.location_id,
        id,
        input.action === "record"
          ? "collection_recorded"
          : "collection_reversed",
      ],
    );
    return { id };
  });
}
export async function reconciliation(
  db: Queryable,
  actor: Actor,
  locationId: string,
  day: string,
) {
  requireAccess(actor, "collect", locationId);
  if (!z.iso.date().safeParse(day).success)
    throw new BookingError("Choose a valid day.");
  return db.query(
    `SELECT c.*,a.snapshot,a.price,u.name AS recorder_name FROM reserve_external_collections c
  JOIN reserve_locations l ON l.id=c.location_id JOIN reserve_appointments a ON a.id=c.appointment_id JOIN reserve_users u ON u.id=c.created_by
  WHERE c.location_id=$1 AND (c.created_at AT TIME ZONE l.timezone)::date=$2::date ORDER BY c.created_at DESC`,
    [locationId, day],
  );
}
