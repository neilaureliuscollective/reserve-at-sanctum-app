import { DateTime } from "luxon";
import type { Queryable, Row } from "../../lib/db";
import { BookingError, units, type Service } from "../../lib/booking";

export type Offering = Service & {
  location_id: string;
  organization_id: string;
  timezone: string;
  notice_minutes: number;
  horizon_days: number;
  cancellation_minutes: number;
  resource_id: string | null;
  provider_name: string;
  location_name: string;
  brand_name: string | null;
  currency: string;
  revision: number;
  policy: string;
};
export async function offering(
  db: Queryable,
  id: string,
  lock = false,
): Promise<Offering> {
  // Configuration and appointment commits lock the same location first.
  if (lock)
    await db.query(
      "SELECT l.id FROM reserve_locations l JOIN reserve_services s ON s.location_id=l.id WHERE s.id=$1 FOR UPDATE OF l",
      [id],
    );
  const [s] = await db.query<Offering>(
    `SELECT s.*,l.timezone,l.notice_minutes,l.horizon_days,l.cancellation_minutes,l.policy,
    p.name AS provider_name,l.name AS location_name,b.name AS brand_name
    FROM reserve_services s JOIN reserve_providers p ON p.id=s.provider_id
    JOIN reserve_locations l ON l.id=s.location_id
    JOIN reserve_provider_locations pl ON pl.provider_id=s.provider_id AND pl.location_id=s.location_id
    LEFT JOIN reserve_provider_brands b ON b.provider_id=p.id
    WHERE s.id=$1 AND s.enabled AND p.enabled AND pl.bookable AND l.booking_enabled AND l.status IN ('pilot','live')`,
    [id],
  );
  if (!s) throw new BookingError("This service is not available.");
  return s;
}
type Hours = Row & {
  provider_id: string | null;
  weekday: number | null;
  day: Date | string | null;
  start_minute: number;
  end_minute: number;
  closed: boolean;
};
export async function validateSlot(
  db: Queryable,
  s: Offering,
  iso: string,
  now = DateTime.now(),
  staff = false,
) {
  const start = DateTime.fromISO(iso, { zone: s.timezone }).setZone(s.timezone);
  if (!start.isValid || start.second || start.millisecond || start.minute % 15)
    throw new BookingError("Choose an available appointment time.");
  if (
    start < now.plus({ minutes: staff ? 0 : s.notice_minutes }) ||
    start > now.plus({ days: s.horizon_days })
  )
    throw new BookingError(
      `Choose a time between ${s.notice_minutes === 120 ? "two hours" : `${s.notice_minutes} minutes`} and ${s.horizon_days} days from now.`,
    );
  const day = start.toISODate()!;
  const hours = await db.query<Hours>(
    "SELECT * FROM reserve_hours WHERE location_id=$1 AND (provider_id IS NULL OR provider_id=$2) AND (day=$3::date OR (day IS NULL AND weekday=$4))",
    [s.location_id, s.provider_id, day, start.weekday],
  );
  const minute = start.hour * 60 + start.minute,
    end = minute + s.minutes + s.buffer;
  const fits = (providerId: string | null) => {
    const rows = hours.filter((h) => h.provider_id === providerId);
    const exceptions = rows.filter((h) => h.day !== null);
    const chosen = exceptions.length ? exceptions : rows;
    return chosen.some(
      (h) => !h.closed && minute >= h.start_minute && end <= h.end_minute,
    );
  };
  if (end > 1440 || !fits(null) || !fits(s.provider_id))
    throw new BookingError("That time is outside studio hours.");
  if (s.resource_id) {
    const [resource] = await db.query(
      "SELECT id FROM reserve_resources WHERE id=$1 AND location_id=$2 AND enabled",
      [s.resource_id, s.location_id],
    );
    if (!resource)
      throw new BookingError("This service resource is unavailable.");
  }
  return start;
}
export async function available(
  db: Queryable,
  s: Offering,
  date: string,
  now = DateTime.now(),
  staff = false,
) {
  const day = DateTime.fromISO(date, { zone: s.timezone });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !day.isValid)
    throw new BookingError("Choose a valid date.");
  const rows = await db.query<{ starts_at: Date | string }>(
    `SELECT starts_at FROM reserve_occupancy WHERE provider_id=$1 AND starts_at >= $2 AND starts_at < $3
    UNION SELECT starts_at FROM reserve_resource_occupancy WHERE resource_id=$4 AND starts_at >= $2 AND starts_at < $3`,
    [
      s.provider_id,
      day.toUTC().toISO(),
      day.plus({ days: 1 }).toUTC().toISO(),
      s.resource_id,
    ],
  );
  const busy = new Set(rows.map((x) => new Date(x.starts_at).toISOString()));
  const slots: { start: string; label: string }[] = [];
  for (
    let offset = 0;
    offset < day.plus({ days: 1 }).diff(day, "minutes").minutes;
    offset += 15
  ) {
    const start = day.startOf("day").plus({ minutes: offset });
    try {
      await validateSlot(db, s, start.toISO()!, now, staff);
      if (units(start, s.minutes + s.buffer).every((u) => !busy.has(u)))
        slots.push({
          start: start.toUTC().toISO()!,
          label: start.toFormat("h:mm a ZZZZ"),
        });
    } catch (e) {
      if (!(e instanceof BookingError)) throw e;
    }
  }
  return slots;
}
