import { RESERVE_ORGANIZATION_ID as ORG, RESERVE_LOCATION_ID as LOCATION } from "./tenancy";
import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import { Actor, BookingError, units, ZONE } from "./booking";
import type { Database, Queryable, Row } from "./db";
export type StudioBlock = Row & {
  id: string;
  starts_at: string | Date;
  ends_at: string | Date;
};
export function requireKatie(actor: Actor) {
  if (
    actor.organization_id !== ORG || (actor.role !== "owner" &&
    !(actor.role === "staff" && actor.provider_id === "katie"))
  )
    throw new BookingError("Katie’s studio access is required.", 403);
}
export async function listBlocks(db: Queryable, actor: Actor) {
  requireKatie(actor);
  return db.query<StudioBlock>(
    "SELECT id,starts_at,ends_at FROM reserve_blocks WHERE provider_id='katie' AND organization_id=$1 AND location_id=$2 AND ends_at>now() ORDER BY starts_at LIMIT 200",
    [actor.organization_id, LOCATION],
  );
}
export async function blockTime(
  db: Database,
  actor: Actor,
  input: { date: string; start: string; end: string },
) {
  requireKatie(actor);
  const start = DateTime.fromISO(`${input.date}T${input.start}`, {
    zone: ZONE,
  });
  const end = DateTime.fromISO(`${input.date}T${input.end}`, { zone: ZONE });
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
        "INSERT INTO reserve_blocks(id,provider_id,starts_at,ends_at,created_by,organization_id,location_id) VALUES($1,'katie',$2,$3,$4,$5,$6)",
        [id, start.toUTC().toISO(), end.toUTC().toISO(), actor.id, actor.organization_id, LOCATION],
      );
      for (const slot of units(start, end.diff(start, "minutes").minutes))
        await tx.query(
          "INSERT INTO reserve_occupancy(provider_id,starts_at,block_reason,block_id,organization_id,location_id) VALUES('katie',$1,'Unavailable',$2,$3,$4)",
          [slot, id, actor.organization_id, LOCATION],
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
export async function removeBlock(db: Queryable, actor: Actor, id: string) {
  requireKatie(actor);
  const rows = await db.query(
    "DELETE FROM reserve_blocks WHERE id=$1 AND provider_id='katie' AND organization_id=$2 AND location_id=$3 RETURNING id",
    [id, actor.organization_id, LOCATION],
  );
  if (!rows.length)
    throw new BookingError(
      "This block has already been removed. Refresh the list.",
      404,
    );
}
