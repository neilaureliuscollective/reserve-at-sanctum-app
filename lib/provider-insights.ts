import { DateTime } from "luxon";
import { z } from "zod";
import { BookingError, type Actor } from "./booking";
import type { Queryable } from "./db";
import { providerScope } from "./booking-pilot";
import { requireCapability } from "./studio-permissions";
import { primaryLocation } from "./experience/locations";

export async function providerInsights(
  db: Queryable,
  actor: Actor,
  raw: unknown = {},
  now: DateTime = DateTime.now(),
) {
  requireCapability(actor, "studio.read");
  requireCapability(actor, "clients.read");
  const input = z
    .object({
      provider: z.string().optional(),
      location: z.string().optional(),
      days: z.coerce
        .number()
        .pipe(z.union([z.literal(30), z.literal(90)]))
        .default(30),
      page: z.coerce.number().int().min(0).max(10000).default(0),
    })
    .strict()
    .parse(raw);
  const provider = providerScope(actor, input.provider);
  const [person] = await db.query<{ id: string; name: string }>(
    "SELECT id,name FROM reserve_providers WHERE id=$1",
    [provider],
  );
  if (!person)
    throw new BookingError("Provider setup is not available yet.", 404);
  const locations = await db.query<{
    id: string;
    name: string;
    timezone: string;
  }>(
    "SELECT l.id,l.name,l.timezone FROM reserve_locations l JOIN reserve_provider_locations pl ON pl.location_id=l.id WHERE pl.provider_id=$1 ORDER BY l.name",
    [provider],
  );
  const location = input.location
    ? locations.find((l) => l.id === input.location)
    : locations[0];
  if (input.location && !location)
    throw new BookingError("Location access is required.", 403);
  if (!location)
    throw new BookingError("An assigned location is needed for Insights.", 409);
  const local = now.setZone(location.timezone);
  const from = local.startOf("day").minus({ days: input.days - 1 });
  const until = local.plus({ days: 30 });
  // Linked CRM and account visits share one verified identity. Never infer a link from contact text.
  // Future bookings span this provider's locations, so a move between houses does not invite duplicate follow-up.
  const [result] = await db.query<{
    metrics: {
      completed: number;
      cancelled: number;
      upcoming: number;
      minutes: number;
      clients: number;
      returning: number;
      rebooked: number;
      followUp: number;
    };
    follow_up: {
      id: string;
      name: string;
      last_visit: string;
      service_name: string;
      visits: number;
    }[];
  }>(
    `
    WITH history AS (
      SELECT a.id,a.location_id,a.starts_at,a.ends_at,a.status,
        COALESCE(a.client_id,c.user_id,'crm:' || a.crm_client_id) AS client_key,
        COALESCE(c.name,u.name,'Client') AS client_name,
        COALESCE(a.crm_client_id,a.client_id) AS client_id,s.name AS service_name
      FROM reserve_appointments a JOIN reserve_services s ON s.id=a.service_id
      LEFT JOIN reserve_clients c ON c.id=a.crm_client_id AND c.provider_id=a.provider_id
      LEFT JOIN reserve_users u ON u.id=COALESCE(a.client_id,c.user_id)
      WHERE a.provider_id=$1
    ), recent AS (
      SELECT * FROM history WHERE COALESCE(location_id,$6)=$2 AND starts_at >= $3 AND starts_at < $4
    ), completed AS (
      SELECT * FROM recent WHERE status='completed' AND ends_at <= $4 AND client_key IS NOT NULL
    ), cohort AS (
      SELECT client_key,min(starts_at) AS first_visit,count(*)::int AS visits FROM completed GROUP BY client_key
    ), continuity AS (
      SELECT c.*,
        EXISTS(SELECT 1 FROM history h WHERE h.client_key=c.client_key AND h.status='confirmed' AND h.starts_at >= $4) AS rebooked,
        EXISTS(SELECT 1 FROM history h WHERE h.client_key=c.client_key AND h.status='completed' AND h.ends_at <= $4 AND h.starts_at < c.first_visit) AS is_returning
      FROM cohort c
    ), latest AS (
      SELECT DISTINCT ON (h.client_key) h.client_key,h.client_id,h.client_name,h.starts_at,h.service_name,c.visits
      FROM completed h JOIN continuity c ON c.client_key=h.client_key WHERE NOT c.rebooked
      ORDER BY h.client_key,h.starts_at DESC,h.id DESC
    ), queue AS (
      SELECT client_id AS id,client_name AS name,starts_at AS last_visit,service_name,visits FROM latest
      ORDER BY starts_at,client_key LIMIT 31 OFFSET $7
    )
    SELECT json_build_object(
      'completed',(SELECT count(*) FROM recent WHERE status='completed' AND ends_at <= $4),
      'cancelled',(SELECT count(*) FROM recent WHERE status='cancelled'),
      'upcoming',(SELECT count(*) FROM history WHERE COALESCE(location_id,$6)=$2 AND status='confirmed' AND starts_at >= $4 AND starts_at < $5),
      'minutes',(SELECT COALESCE(sum(EXTRACT(EPOCH FROM (ends_at-starts_at))/60),0) FROM recent WHERE status='completed' AND ends_at <= $4),
      'clients',(SELECT count(*) FROM cohort),
      'returning',(SELECT count(*) FROM continuity WHERE is_returning),
      'rebooked',(SELECT count(*) FROM continuity WHERE rebooked),
      'followUp',(SELECT count(*) FROM latest)
    ) AS metrics,COALESCE((SELECT json_agg(queue) FROM queue),'[]'::json) AS follow_up
  `,
    [
      provider,
      location.id,
      from.toUTC().toISO()!,
      now.toUTC().toISO()!,
      until.toUTC().toISO()!,
      primaryLocation.id,
      input.page * 30,
    ],
  );
  if (!result) throw new Error("Insights read returned no result");
  return {
    provider: person,
    locations,
    location,
    days: input.days,
    page: input.page,
    from: from.toISODate()!,
    asOf: now.toUTC().toISO()!,
    upcomingUntil: until.toUTC().toISO()!,
    metrics: result.metrics,
    rebookedPercent: result.metrics.clients
      ? Math.round((result.metrics.rebooked / result.metrics.clients) * 100)
      : null,
    followUp: result.follow_up.slice(0, 30),
    hasMore: result.follow_up.length > 30,
  };
}
export type ProviderInsights = Awaited<ReturnType<typeof providerInsights>>;
