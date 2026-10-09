import { providerScope } from "./booking-pilot";
import { hasCapability } from "./studio-permissions";
import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import { Actor, BookingError, units, ZONE } from "./booking";
import type { Database, Queryable, Row } from "./db";
export type StudioBlock = Row & {
  id: string;
  starts_at: string | Date;
  ends_at: string | Date;
};
async function context(db: Queryable, actor: Actor, provider?: string) {
  const id = providerScope(actor, provider || actor.provider_id || "katie");
  if (!hasCapability(actor, "blocks.manage"))
    throw new BookingError("Provider block access is required.", 403);
  const [p] = await db.query<{ timezone: string }>(
    "SELECT COALESCE(l.timezone,'America/Chicago') AS timezone FROM reserve_providers p LEFT JOIN reserve_locations l ON l.id=p.location_id WHERE p.id=$1",
    [id],
  );
  if (!p) throw new BookingError("Provider access is not configured.", 403);
  return { id, zone: p.timezone };
}
export async function listBlocks(
  db: Queryable,
  actor: Actor,
  provider?: string,
) {
  const { id } = await context(db, actor, provider);
  return db.query<StudioBlock>(
    "SELECT id,provider_id,starts_at,ends_at FROM reserve_blocks WHERE provider_id=$1 AND ends_at>now() ORDER BY starts_at LIMIT 200",
    [id],
  );
}
export async function blockTime(
  db: Database,
  actor: Actor,
  input: { date: string; start: string; end: string; provider?: string },
) {
  const { id: provider, zone } = await context(db, actor, input.provider);
  const start = DateTime.fromISO(`${input.date}T${input.start}`, {
    zone,
  });
  const end = DateTime.fromISO(`${input.date}T${input.end}`, { zone });
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
        "INSERT INTO reserve_blocks(id,provider_id,starts_at,ends_at,created_by) VALUES($1,$5,$2,$3,$4)",
        [id, start.toUTC().toISO(), end.toUTC().toISO(), actor.id, provider],
      );
      for (const slot of units(start, end.diff(start, "minutes").minutes))
        await tx.query(
          "INSERT INTO reserve_occupancy(provider_id,starts_at,block_reason,block_id) VALUES($3,$1,'Unavailable',$2)",
          [slot, id, provider],
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
export async function removeBlock(
  db: Queryable,
  actor: Actor,
  id: string,
  providerId?: string,
) {
  const { id: provider } = await context(db, actor, providerId);
  const rows = await db.query(
    "DELETE FROM reserve_blocks WHERE id=$1 AND provider_id=$2 RETURNING id",
    [id, provider],
  );
  if (!rows.length)
    throw new BookingError(
      "This block has already been removed. Refresh the list.",
      404,
    );
}
