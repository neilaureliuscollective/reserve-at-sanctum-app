import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import { Actor, BookingError, units, ZONE } from "./booking";
import type { Database, Queryable, Row } from "./db";
import { requireAccess, assignments } from "../domains/access";
export type StudioBlock = Row & {
  id: string;
  starts_at: string | Date;
  ends_at: string | Date;
};
async function target(
  db: Queryable,
  actor: Actor,
  providerId?: string,
  locationId = "eunice",
) {
  const id = providerId || actor.provider_id;
  const [provider] = await db.query<{ provider_id: string }>(
    "SELECT provider_id FROM reserve_provider_locations WHERE location_id=$1 AND ($2::text IS NULL OR provider_id=$2) ORDER BY provider_id LIMIT 1",
    [locationId, id],
  );
  if (!provider)
    throw new BookingError("Provider workspace access is required.", 403);
  requireAccess(actor, "schedule", locationId, provider.provider_id);
  return { providerId: provider.provider_id, locationId };
}
export async function listBlocks(
  db: Queryable,
  actor: Actor,
  providerId?: string,
  locationId = "eunice",
) {
  const t = await target(db, actor, providerId, locationId);
  return db.query<StudioBlock>(
    "SELECT id,starts_at,ends_at FROM reserve_blocks WHERE provider_id=$1 AND location_id=$2 AND ends_at>now() ORDER BY starts_at LIMIT 200",
    [t.providerId, t.locationId],
  );
}
export async function blockTime(
  db: Database,
  actor: Actor,
  input: {
    date: string;
    start: string;
    end: string;
    providerId?: string;
    locationId?: string;
  },
) {
  const t = await target(db, actor, input.providerId, input.locationId);
  const [location] = await db.query<{ timezone: string }>(
    "SELECT timezone FROM reserve_locations WHERE id=$1",
    [t.locationId],
  );
  const start = DateTime.fromISO(`${input.date}T${input.start}`, {
    zone: location.timezone,
  });
  const end = DateTime.fromISO(`${input.date}T${input.end}`, {
    zone: location.timezone,
  });
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
    !/^\d{2}:\d{2}$/.test(input.start) ||
    !/^\d{2}:\d{2}$/.test(input.end) ||
    !start.isValid ||
    !end.isValid ||
    start.toFormat("HH:mm") !== input.start ||
    end.toFormat("HH:mm") !== input.end ||
    start.minute % 15 ||
    end.minute % 15 ||
    start <= DateTime.now() ||
    end <= start ||
    start > DateTime.now().plus({ days: 45 })
  )
    throw new BookingError(
      "Choose a future time today or within 45 days, in 15-minute steps, ending later the same day.",
    );
  const id = randomUUID();
  try {
    await db.transaction(async (tx) => {
      await tx.query(
        "SELECT id FROM reserve_locations WHERE id=$1 FOR UPDATE",
        [t.locationId],
      );
      await tx.query(
        "INSERT INTO reserve_blocks(id,provider_id,location_id,starts_at,ends_at,created_by) VALUES($1,$2,$3,$4,$5,$6)",
        [
          id,
          t.providerId,
          t.locationId,
          start.toUTC().toISO(),
          end.toUTC().toISO(),
          actor.id,
        ],
      );
      await tx.query(
        "INSERT INTO reserve_operation_events(actor_id,location_id,entity_id,action) VALUES($1,$2,$3,'blocked')",
        [actor.id, t.locationId, id],
      );
      for (const slot of units(start, end.diff(start, "minutes").minutes))
        await tx.query(
          "INSERT INTO reserve_occupancy(provider_id,starts_at,block_reason,block_id) VALUES($1,$2,'Unavailable',$3)",
          [t.providerId, slot, id],
        );
    });
  } catch (e) {
    if ((e as { code?: string }).code === "23505")
      throw new BookingError(
        "This overlaps a visit or another block. Nothing was changed.",
        409,
      );
    throw e;
  }
  return id;
}
export async function removeBlock(db: Database, actor: Actor, id: string) {
  if (!assignments(actor).length)
    throw new BookingError("Workspace access is required.", 403);
  return db.transaction(async (db) => {
    const [block] = await db.query<{
      provider_id: string;
      location_id: string;
    }>("SELECT provider_id,location_id FROM reserve_blocks WHERE id=$1", [id]);
    if (!block)
      throw new BookingError(
        "This block is unavailable or outside your workspace access.",
        404,
      );
    requireAccess(actor, "schedule", block.location_id, block.provider_id);
    await db.query("DELETE FROM reserve_blocks WHERE id=$1", [id]);
    await db.query(
      "INSERT INTO reserve_operation_events(actor_id,location_id,entity_id,action) VALUES($1,$2,$3,'block_removed')",
      [actor.id, block.location_id, id],
    );
  });
}
