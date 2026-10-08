import type { Actor } from "../booking";
import { BookingError } from "../booking-error";
import type { Queryable } from "../db";
import { requireVitalisOwner } from "./store";
import {
  launchGates,
  launchInput,
  commercialBoundary,
  type LaunchRecord,
} from "./launch-design";
export async function launchOverview(db: Queryable, a: Actor) {
  requireVitalisOwner(a);
  const [rows, pilot] = await Promise.all([
    db.query<LaunchRecord & Record<string, unknown>>(
      "SELECT gate AS key,reviewed,reference,revision,updated_at FROM reserve_vitalis_launch_reviews",
    ),
    db.query(
      "SELECT count(*) FILTER(WHERE active)::int AS active,count(*) FILTER(WHERE active AND updated_at>now()-interval '7 days')::int AS recently_updated FROM reserve_vitalis_journeys",
    ),
  ]);
  return {
    gates: launchGates.map((g) => ({
      ...g,
      ...(rows.find((r) => r.key === g.key) ?? {
        reviewed: false,
        reference: "",
        revision: 0,
        updated_at: null,
      }),
    })),
    pilot: pilot[0],
    boundary: commercialBoundary,
  };
}
export async function saveLaunchReview(
  db: Queryable,
  a: Actor,
  input: unknown,
) {
  requireVitalisOwner(a);
  const i = launchInput.parse(input);
  const params = [i.key, i.reviewed, i.reference, a.id];
  const rows = await db.query(
    i.revision === 0
      ? "INSERT INTO reserve_vitalis_launch_reviews(gate,reviewed,reference,updated_by) VALUES($1,$2,$3,$4) ON CONFLICT(gate) DO NOTHING RETURNING revision"
      : "UPDATE reserve_vitalis_launch_reviews SET reviewed=$2,reference=$3,updated_by=$4,revision=revision+1,updated_at=now() WHERE gate=$1 AND revision=$5 RETURNING revision",
    i.revision === 0 ? params : [...params, i.revision],
  );
  if (!rows[0])
    throw new BookingError(
      "This review changed. Reload before saving again.",
      409,
    );
  return { revision: Number(rows[0].revision) };
}
