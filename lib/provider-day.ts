import { DateTime } from "luxon";
import { BookingError, availability, type Actor } from "./booking";
import type { Queryable } from "./db";
import { providerScope } from "./booking-pilot";
import { hasCapability, requireCapability } from "./studio-permissions";
import { primaryLocation } from "./experience/locations";
export async function providerDay(
  db: Queryable,
  actor: Actor,
  input: {
    provider?: string;
    location?: string;
    date?: string;
    service?: string;
  } = {},
  now = DateTime.now(),
) {
  requireCapability(actor, "studio.read");
  const provider = providerScope(actor, input.provider);
  const [person] = await db.query<{
    id: string;
    name: string;
    enabled: boolean;
  }>("SELECT id,name,enabled FROM reserve_providers WHERE id=$1", [provider]);
  if (!person)
    throw new BookingError("Provider setup is not available yet.", 404);
  const locations = await db.query<{
    id: string;
    name: string;
    timezone: string;
    enabled: boolean;
    booking_enabled: boolean;
  }>(
    "SELECT l.id,l.name,l.timezone,l.enabled,l.booking_enabled FROM reserve_locations l JOIN reserve_provider_locations pl ON pl.location_id=l.id WHERE pl.provider_id=$1 ORDER BY l.name",
    [provider],
  );
  const location = input.location
    ? locations.find((l) => l.id === input.location)
    : locations[0];
  if (input.location && !location)
    throw new BookingError("Location access is required.", 403);
  if (!location)
    return {
      provider: person,
      locations,
      location: null,
      date: now.toISODate()!,
      visits: [],
      hasMore: false,
      counts: { confirmed: 0, completed: 0, cancelled: 0 },
      services: [],
      service: null,
      slots: [],
      slotState: "unconfigured" as const,
    };
  const date = input.date || now.setZone(location.timezone).toISODate()!;
  const day = DateTime.fromISO(date, { zone: location.timezone }).startOf(
    "day",
  );
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !day.isValid)
    throw new BookingError("Choose a valid day.");
  const [rows, services] = await Promise.all([
    db.query<{
      id: string;
      client_id: string | null;
      crm_client_id: string | null;
      client_name: string;
      service_name: string;
      starts_at: Date | string;
      ends_at: Date | string;
      status: string;
    }>(
      `SELECT a.id,a.client_id,a.crm_client_id,COALESCE(c.name,u.name,'Client') AS client_name,s.name AS service_name,a.starts_at,a.ends_at,a.status FROM reserve_appointments a JOIN reserve_services s ON s.id=a.service_id LEFT JOIN reserve_clients c ON c.id=a.crm_client_id LEFT JOIN reserve_users u ON u.id=a.client_id WHERE a.provider_id=$1 AND COALESCE(a.location_id,$5)=$2 AND a.starts_at >= $3 AND a.starts_at < $4 ORDER BY a.starts_at,a.id LIMIT 101`,
      [
        provider,
        location.id,
        day.toUTC().toISO()!,
        day.plus({ days: 1 }).toUTC().toISO()!,
        primaryLocation.id,
      ],
    ),
    db.query<{ id: string; name: string; minutes: number }>(
      "SELECT id,name,minutes FROM reserve_services WHERE provider_id=$1 AND enabled ORDER BY minutes,name",
      [provider],
    ),
  ]);
  const chosen = input.service
    ? services.find((s) => s.id === input.service)
    : services[0];
  if (input.service && !chosen)
    throw new BookingError("Service unavailable.", 404);
  let slots: { start: string; label: string }[] = [],
    slotState: "ready" | "closed" | "unconfigured" | "unavailable" =
      "unconfigured";
  if (
    chosen &&
    person.enabled &&
    location.enabled &&
    location.booking_enabled &&
    hasCapability(actor, "appointments.manage")
  ) {
    try {
      slots = await availability(db, chosen.id, date, now, location.id, true);
      slotState = "ready";
    } catch (e) {
      if (e instanceof BookingError) slotState = "closed";
      else slotState = "unavailable";
    }
  } else if (chosen) slotState = "closed";
  const list = rows.slice(0, 100);
  return {
    provider: person,
    locations,
    location,
    date,
    visits: list.map((v) => ({
      ...v,
      starts_at: new Date(v.starts_at).toISOString(),
      ends_at: new Date(v.ends_at).toISOString(),
      clientHref:
        hasCapability(actor, "clients.read") && (v.crm_client_id || v.client_id)
          ? `/studio/clients/${encodeURIComponent(v.crm_client_id || v.client_id!)}`
          : null,
    })),
    hasMore: rows.length > 100,
    counts: {
      confirmed: list.filter((v) => v.status === "confirmed").length,
      completed: list.filter((v) => v.status === "completed").length,
      cancelled: list.filter((v) => v.status === "cancelled").length,
    },
    services,
    service: chosen || null,
    slots,
    slotState,
  };
}
export type ProviderDay = Awaited<ReturnType<typeof providerDay>>;
