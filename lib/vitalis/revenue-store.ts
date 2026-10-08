import type { Actor } from "../booking";
import type { Queryable } from "../db";
import { BookingError } from "../booking-error";
import { z } from "zod";
import { requireVitalisOwner } from "./store";
import { forecastSchema, preset, scenarioKeys } from "./economics";
export const saveForecastSchema = z
  .object({
    key: z.enum(scenarioKeys),
    revision: z.number().int().nonnegative(),
    assumptions: forecastSchema,
  })
  .strict();
export async function revenueOverview(db: Queryable, a: Actor) {
  requireVitalisOwner(a);
  const [saved, demand, memberships] = await Promise.all([
    db.query(
      "SELECT scenario,assumptions,revision,updated_at FROM reserve_vitalis_forecasts ORDER BY scenario",
    ),
    db.query(
      "SELECT count(*)::int AS registrations,count(*) FILTER(WHERE outreach)::int AS email_permission FROM reserve_vitalis_interests WHERE status='active'",
    ),
    db.query(
      "SELECT access_basis,count(*)::int AS count FROM reserve_memberships WHERE status='active' AND (starts_at IS NULL OR starts_at<=now()) AND (ends_at IS NULL OR ends_at>now()) GROUP BY access_basis",
    ),
  ]);
  return {
    scenarios: scenarioKeys.map((key) => {
      const row = saved.find((r) => r.scenario === key);
      return {
        key,
        revision: row ? Number(row.revision) : 0,
        updatedAt: row?.updated_at ?? null,
        assumptions: row ? forecastSchema.parse(row.assumptions) : preset(key),
      };
    }),
    actuals: {
      demand: demand[0],
      existingMemberships: memberships,
      paidVitalis: "unconnected" as const,
      paidRevenue: null,
    },
  };
}
export async function saveForecast(db: Queryable, a: Actor, input: unknown) {
  requireVitalisOwner(a);
  const i = saveForecastSchema.parse(input);
  const rows =
    i.revision === 0
      ? await db.query(
          "INSERT INTO reserve_vitalis_forecasts(scenario,assumptions,updated_by) VALUES($1,$2::jsonb,$3) ON CONFLICT(scenario) DO NOTHING RETURNING revision",
          [i.key, JSON.stringify(i.assumptions), a.id],
        )
      : await db.query(
          "UPDATE reserve_vitalis_forecasts SET assumptions=$2::jsonb,revision=revision+1,updated_by=$3,updated_at=now() WHERE scenario=$1 AND revision=$4 RETURNING revision",
          [i.key, JSON.stringify(i.assumptions), a.id, i.revision],
        );
  if (!rows[0])
    throw new BookingError(
      "This scenario changed in another session. Refresh before saving.",
      409,
    );
  return { revision: Number(rows[0].revision) };
}
