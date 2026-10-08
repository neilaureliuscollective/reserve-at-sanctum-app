import { optionalRead } from "./optional-read";
import type { Actor } from "../booking";
import { database, type Queryable } from "../db";
import { listLocations, primaryLocation } from "./locations";
import { membershipDesk } from "../membership";
import { readVisitContinuity } from "./visits";
export type ReadState<T> =
  { state: "ready"; data: T } | { state: "unavailable"; data: null };
export async function memberRead<T>(
  fn: () => Promise<T>,
  milliseconds = 6000,
): Promise<ReadState<T>> {
  try {
    return { state: "ready", data: await optionalRead(fn, milliseconds) };
  } catch {
    return { state: "unavailable", data: null };
  }
}
export async function memberSummary(db: Queryable, actor: Actor | null) {
  const [houses, membership, visits] = await Promise.all([
    memberRead(async () => {
      const rows = await listLocations(db);
      const [preference] = actor
        ? await db.query<{ preferred_location_id: string | null }>(
            "SELECT preferred_location_id FROM reserve_users WHERE id=$1",
            [actor.id],
          )
        : [];
      const house =
        rows.find(
          (l) => l.id === preference?.preferred_location_id && l.enabled,
        ) ??
        rows.find((l) => l.id === primaryLocation.id) ??
        rows[0];
      return { house, locations: rows.filter((l) => l.enabled) };
    }),
    memberRead(() => membershipDesk(db, actor)),
    memberRead(() =>
      actor
        ? readVisitContinuity(db, actor)
        : Promise.resolve({ next: null, previous: null, selected: null }),
    ),
  ]);
  return { houses, membership, visits };
}

export function readMemberSummary(actor: Actor | null) {
  return memberSummary(
    {
      query: async <T extends Record<string, unknown>>(
        sql: string,
        params?: unknown[],
      ) => (await database()).query<T>(sql, params),
    },
    actor,
  );
}
