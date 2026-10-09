import { isFixItApp } from "./app-edition";
import { BookingError } from "./booking-error";
export { BookingError } from "./booking-error";
import { hasCapability, requireCapability } from "./studio-permissions";
import { DateTime } from "luxon";
import { randomUUID } from "node:crypto";
import type { Database, Queryable, Row } from "./db";
import { bookingLocation, primaryLocation } from "./experience/locations";
export const ZONE = "America/Chicago";
export type Actor = Row & {
  id: string;
  name: string;
  email: string;
  role: "client" | "staff" | "operator" | "owner";
  capability_overrides?: import("./studio-permissions").CapabilityOverride[];
  provider_id: string | null;
};
export type Service = Row & {
  id: string;
  name: string;
  description: string;
  provider_id: string;
  minutes: number;
  buffer: number;
  price: number;
  location_id?: string | null;
  provider_name?: string;
  timezone?: string;
};
export type Appointment = Row & {
  id: string;
  client_id: string | null;
  crm_client_id?: string | null;
  timezone?: string;
  provider_name?: string;
  provider_id: string;
  service_id: string;
  starts_at: Date | string;
  ends_at: Date | string;
  busy_until: Date | string;
  original_start: Date | string;
  price: number;
  revision: number;
  status: string;
  note: string;
  service_name?: string;
  client_name?: string;
  location_id?: string | null;
};
const iso = (x: Date | string) => new Date(x).toISOString();
export async function catalog(db: Queryable, locationId = primaryLocation.id) {
  let location;
  try {
    location = await bookingLocation(db, locationId);
  } catch (e) {
    if (
      e instanceof Error &&
      e.message === "This location is not accepting appointments."
    )
      return [];
    throw e;
  }
  const rows = await db.query<Service>(
    `SELECT s.*,p.name AS provider_name,$1::text AS location_id,$2::text AS timezone
     FROM reserve_services s JOIN reserve_providers p ON p.id=s.provider_id
     WHERE s.enabled AND p.enabled AND EXISTS
     (SELECT 1 FROM reserve_provider_locations pl WHERE pl.provider_id=p.id AND pl.location_id=$1)
     ORDER BY p.name,s.minutes`,
    [location.id, location.timezone],
  );
  return isFixItApp() ? rows.filter(s => s.provider_id === "katie") : rows;
}
export async function serviceLocation(
  db: Queryable,
  s: Service,
  locationId: string,
  lock = false,
) {
  let location;
  try {
    location = await bookingLocation(db, locationId, lock);
  } catch (e) {
    if (
      e instanceof Error &&
      e.message === "This location is not accepting appointments."
    )
      throw new BookingError(e.message);
    throw e;
  }
  const assignments = await db.query(
    `SELECT provider_id FROM reserve_provider_locations WHERE provider_id=$1 AND location_id=$2 ${lock ? "FOR SHARE" : ""}`,
    [s.provider_id, location.id],
  );
  if (!assignments.length)
    throw new BookingError("This service is not offered at this location.");
  return { ...s, location_id: location.id, timezone: location.timezone };
}
export async function service(db: Queryable, id: string, lock = false) {
  if (lock) {
    // Configuration and booking acquire provider, then service locks in this order.
    await db.query(
      "SELECT p.id FROM reserve_providers p JOIN reserve_services s ON s.provider_id=p.id WHERE s.id=$1 FOR SHARE OF p",
      [id],
    );
  }
  const [s] = await db.query<Service>(
    `SELECT s.* FROM reserve_services s JOIN reserve_providers p ON p.id=s.provider_id WHERE s.id=$1 AND s.enabled AND p.enabled ${lock ? "FOR SHARE OF s" : ""}`,
    [id],
  );
  if (!s || (isFixItApp() && s.provider_id !== "katie")) throw new BookingError("This service is not available.");
  return s;
}
export function units(start: DateTime, count: number) {
  return Array.from(
    { length: count / 15 },
    (_, i) =>
      start
        .plus({ minutes: i * 15 })
        .toUTC()
        .toISO()!,
  );
}
type ProviderHours = Row & {
  weekdays: number[];
  open_hour: number;
  close_hour: number;
};
export async function validateTime(
  db: Queryable,
  s: Service,
  startISO: string,
  now: DateTime = DateTime.now(),
  hours?: ProviderHours,
  staffEntry = false,
) {
  const start = DateTime.fromISO(startISO, {
    zone: s.timezone || ZONE,
  }).setZone(s.timezone || ZONE);
  if (
    !start.isValid ||
    start.second !== 0 ||
    start.millisecond !== 0 ||
    start.minute % 15 !== 0
  )
    throw new BookingError("Choose an available appointment time.");
  if (
    start < now.plus({ minutes: staffEntry ? 0 : 120 }) ||
    start > now.plus({ days: 45 })
  )
    throw new BookingError(
      staffEntry
        ? "Choose a future time within 45 days."
        : "Choose a time between two hours and 45 days from now.",
    );
  const p =
    hours ||
    (
      await db.query<ProviderHours>(
        "SELECT weekdays,open_hour,close_hour FROM reserve_providers WHERE id=$1",
        [s.provider_id],
      )
    )[0];
  if (
    !p ||
    !p.weekdays.includes(start.weekday) ||
    start.hour < p.open_hour ||
    start.plus({ minutes: s.minutes + s.buffer }) >
      start
        .startOf("day")
        .set({ hour: Math.min(p.close_hour, 23), minute: 0 })
        .plus({ hours: p.close_hour === 24 ? 1 : 0 })
  )
    throw new BookingError("That time is outside studio hours.");
  return start;
}
export async function availability(
  db: Queryable,
  serviceId: string,
  date: string,
  now: DateTime = DateTime.now(),
  locationId = primaryLocation.id,
  staffEntry = false,
) {
  const s = await serviceLocation(db, await service(db, serviceId), locationId),
    day = DateTime.fromISO(date, { zone: s.timezone || ZONE });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !day.isValid)
    throw new BookingError("Choose a valid date.");
  const occupied = await db.query<{ starts_at: Date | string }>(
    "SELECT starts_at FROM reserve_occupancy WHERE provider_id=$1 AND starts_at >= $2 AND starts_at < $3",
    [s.provider_id, day.toUTC().toISO(), day.plus({ days: 1 }).toUTC().toISO()],
  );
  const busy = new Set(occupied.map((x) => iso(x.starts_at)));
  const [hours] = await db.query<ProviderHours>(
    "SELECT weekdays,open_hour,close_hour FROM reserve_providers WHERE id=$1",
    [s.provider_id],
  );
  const slots = [];
  for (
    let minutes = 0;
    minutes < day.plus({ days: 1 }).diff(day, "minutes").minutes;
    minutes += 15
  ) {
    const start = day.startOf("day").plus({ minutes });
    try {
      await validateTime(db, s, start.toISO()!, now, hours, staffEntry);
      if (units(start, s.minutes + s.buffer).every((x) => !busy.has(iso(x))))
        slots.push({
          start: start.toUTC().toISO()!,
          label: start.toFormat("h:mm a"),
        });
    } catch (e) {
      if (!(e instanceof BookingError)) throw e;
    }
  }
  return slots;
}
export function canAccess(actor: Actor, a: Appointment) {
  if (isFixItApp() && a.provider_id !== "katie") return false;
  return (
    actor.role === "owner" ||
    (hasCapability(actor, "appointments.manage") &&
      actor.provider_id === a.provider_id) ||
    actor.id === a.client_id
  );
}
export async function occupy(
  tx: Queryable,
  a: Appointment,
  start: DateTime,
  minutes: number,
) {
  for (const u of units(start, minutes))
    await tx.query(
      "INSERT INTO reserve_occupancy(provider_id,starts_at,appointment_id) VALUES($1,$2,$3)",
      [a.provider_id, u, a.id],
    );
}
function conflict(e: unknown): never {
  if ((e as { code?: string }).code === "23505")
    throw new BookingError(
      "That time was just taken. Please choose another.",
      409,
    );
  throw e;
}
type AccountAppointment = Appointment & { client_id: string };
export async function book(
  db: Database,
  actor: Actor,
  input: {
    serviceId: string;
    start: string;
    note: string;
    requestKey: string;
    locationId?: string;
  },
) {
  try {
    return await db.transaction(async (tx) => {
      const [prior] = await tx.query<AccountAppointment>(
        "SELECT * FROM reserve_appointments WHERE client_id=$1 AND request_key=$2 AND source='online'",
        [actor.id, input.requestKey],
      );
      if (prior) {
        if (isFixItApp() && prior.provider_id !== "katie") throw new BookingError("Appointment not found.", 404);
        if (
          prior.service_id !== input.serviceId ||
          iso(prior.original_start) !== iso(input.start) ||
          prior.note !== input.note ||
          (prior.location_id ?? primaryLocation.id) !==
            (input.locationId ?? primaryLocation.id)
        )
          throw new BookingError(
            "This request was already used for another booking.",
            409,
          );
        return prior;
      }
      const s = await serviceLocation(
          tx,
          await service(tx, input.serviceId, true),
          input.locationId ?? primaryLocation.id,
          true,
        ),
        start = await validateTime(tx, s, input.start),
        id = randomUUID();
      const [a] = await tx.query<AccountAppointment>(
        `INSERT INTO reserve_appointments(id,client_id,provider_id,service_id,starts_at,ends_at,busy_until,price,note,request_key,original_start,location_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$5,$11) RETURNING *`,
        [
          id,
          actor.id,
          s.provider_id,
          s.id,
          start.toUTC().toISO(),
          start.plus({ minutes: s.minutes }).toUTC().toISO(),
          start
            .plus({ minutes: s.minutes + s.buffer })
            .toUTC()
            .toISO(),
          s.price,
          input.note,
          input.requestKey,
          s.location_id,
        ],
      );
      const [crm] = await tx.query<{ id: string }>(
        "INSERT INTO reserve_clients(id,provider_id,user_id,name,email,source,source_key,created_by) VALUES($1,$2,$3,$4,$5,'account',$3,$3) ON CONFLICT(provider_id,user_id) WHERE user_id IS NOT NULL DO UPDATE SET user_id=EXCLUDED.user_id RETURNING id",
        [
          randomUUID(),
          s.provider_id,
          actor.id,
          actor.name,
          actor.email.toLowerCase(),
        ],
      );
      await tx.query(
        "UPDATE reserve_appointments SET crm_client_id=$2,created_by=$3 WHERE id=$1",
        [a.id, crm.id, actor.id],
      );
      a.crm_client_id = crm.id;
      await occupy(tx, a, start, s.minutes + s.buffer);
      await queueBookingMessage(tx, a, "booked");
      await tx.query(
        "INSERT INTO reserve_audit(actor_id,appointment_id,action) VALUES($1,$2,'booked')",
        [actor.id, id],
      );
      return a;
    });
  } catch (e) {
    if ((e as { code?: string }).code === "23505") {
      const [prior] = await db.query<AccountAppointment>(
        "SELECT * FROM reserve_appointments WHERE client_id=$1 AND request_key=$2 AND source='online'",
        [actor.id, input.requestKey],
      );
      if (
        prior &&
        prior.service_id === input.serviceId &&
        iso(prior.original_start) === iso(input.start) &&
        prior.note === input.note &&
        (prior.location_id ?? primaryLocation.id) ===
          (input.locationId ?? primaryLocation.id)
      )
        return prior;
      if (prior)
        throw new BookingError(
          "This request was already used for another booking.",
          409,
        );
    }
    return conflict(e);
  }
}
export async function change(
  db: Database,
  actor: Actor,
  id: string,
  input: {
    action: "cancel" | "reschedule" | "complete";
    start?: string;
    revision: number;
  },
) {
  try {
    return await db.transaction(async (tx) => {
      const [a] = await tx.query<Appointment>(
        "SELECT * FROM reserve_appointments WHERE id=$1 FOR UPDATE",
        [id],
      );
      if (!a || !canAccess(actor, a))
        throw new BookingError("Appointment not found.", 404);
      if (a.status !== "confirmed")
        throw new BookingError("This appointment is no longer active.", 409);
      if (a.revision !== input.revision)
        throw new BookingError(
          "This visit changed. Refresh before making another change.",
          409,
        );
      if (input.action === "complete") {
        requireCapability(actor, "appointments.manage");
        if (actor.role !== "owner" && actor.provider_id !== a.provider_id)
          throw new BookingError(
            "This visit is outside your provider schedule.",
            403,
          );
        if (new Date(a.ends_at).getTime() > Date.now())
          throw new BookingError(
            "Mark a visit complete after its scheduled end.",
            409,
          );
        await tx.query(
          "UPDATE reserve_appointments SET status='completed',revision=revision+1 WHERE id=$1",
          [id],
        );
        await tx.query(
          "INSERT INTO reserve_audit(actor_id,appointment_id,action) VALUES($1,$2,'completed')",
          [actor.id, id],
        );
        await tx.query(
          "UPDATE reserve_booking_messages SET state='superseded' WHERE appointment_id=$1 AND state IN ('manual_required','failed')",
          [id],
        );
        return (
          await tx.query<Appointment>(
            "SELECT * FROM reserve_appointments WHERE id=$1",
            [id],
          )
        )[0];
      }
      if (new Date(a.starts_at).getTime() < Date.now())
        throw new BookingError("Past visits cannot be changed.");
      let start: DateTime | undefined;
      if (input.action === "reschedule") {
        if (!input.start) throw new BookingError("Choose a new time.");
        const originalMinutes =
          (new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime()) /
          60000;
        const buffer =
          (new Date(a.busy_until).getTime() - new Date(a.ends_at).getTime()) /
          60000;
        const s = {
          ...(await serviceLocation(
            tx,
            await service(tx, a.service_id, true),
            a.location_id ?? primaryLocation.id,
            true,
          )),
          minutes: originalMinutes,
          buffer,
        };
        start = await validateTime(
          tx,
          s,
          input.start,
          undefined,
          undefined,
          hasCapability(actor, "appointments.manage"),
        );
        await tx.query(
          "DELETE FROM reserve_occupancy WHERE appointment_id=$1",
          [id],
        );
        await occupy(tx, a, start, s.minutes + s.buffer);
        await tx.query(
          "UPDATE reserve_appointments SET starts_at=$1,ends_at=$2,busy_until=$3,revision=revision+1 WHERE id=$4",
          [
            start.toUTC().toISO(),
            start.plus({ minutes: s.minutes }).toUTC().toISO(),
            start
              .plus({ minutes: s.minutes + s.buffer })
              .toUTC()
              .toISO(),
            id,
          ],
        );
      } else {
        await tx.query(
          "DELETE FROM reserve_occupancy WHERE appointment_id=$1",
          [id],
        );
        await tx.query(
          "UPDATE reserve_appointments SET status='cancelled',revision=revision+1 WHERE id=$1",
          [id],
        );
      }
      await tx.query(
        "INSERT INTO reserve_audit(actor_id,appointment_id,action) VALUES($1,$2,$3)",
        [actor.id, id, input.action],
      );
      const [updated] = await tx.query<Appointment>(
        "SELECT * FROM reserve_appointments WHERE id=$1",
        [id],
      );
      await queueBookingMessage(tx, updated, input.action);
      return updated;
    });
  } catch (e) {
    return conflict(e);
  }
}
export async function visits(
  db: Queryable,
  actor: Actor,
  studio = false,
  page = 0,
  date = "",
  days = 1,
  providerId = "",
  locationId = "",
) {
  if (studio) requireCapability(actor, "appointments.read");
  const where = studio
    ? actor.role === "owner"
      ? "TRUE"
      : "a.provider_id=$1"
    : "a.client_id=$1";
  const values =
    studio && actor.role === "owner"
      ? []
      : [studio ? actor.provider_id : actor.id];
  let dayFilter = "";
  let zone = ZONE;
  if (locationId) {
    const [location] = await db.query<{ timezone: string }>(
      "SELECT timezone FROM reserve_locations WHERE id=$1",
      [locationId],
    );
    if (!location) throw new BookingError("Location unavailable.");
    zone = location.timezone;
    values.push(locationId, primaryLocation.id);
    dayFilter += ` AND COALESCE(a.location_id,$${values.length})=$${values.length - 1}`;
  }
  if (isFixItApp()) {
    if (providerId && providerId !== "katie") throw new BookingError("Provider access is required.", 403);
    providerId = "katie";
  }
  if (providerId) {
    if (studio && actor.role !== "owner" && actor.provider_id !== providerId)
      throw new BookingError("Provider access is required.", 403);
    values.push(providerId);
    dayFilter += ` AND a.provider_id=$${values.length}`;
  }
  if (studio && date) {
    const day = DateTime.fromISO(date, { zone }).startOf("day");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !day.isValid)
      throw new BookingError("Choose a valid schedule day.");
    dayFilter += ` AND a.starts_at >= $${values.length + 1} AND a.starts_at < $${values.length + 2}`;
    values.push(day.toUTC().toISO()!, day.plus({ days }).toUTC().toISO()!);
  }
  const offsetParam = values.length + 1;
  return db.query<Appointment>(
    `SELECT a.*,s.name AS service_name,COALESCE(c.name,u.name) AS client_name,p.name AS provider_name,COALESCE(l.timezone,'America/Chicago') AS timezone FROM reserve_appointments a JOIN reserve_services s ON s.id=a.service_id LEFT JOIN reserve_users u ON u.id=a.client_id LEFT JOIN reserve_clients c ON c.id=a.crm_client_id JOIN reserve_providers p ON p.id=a.provider_id LEFT JOIN reserve_locations l ON l.id=a.location_id WHERE ${where}${dayFilter} ORDER BY a.starts_at ${date ? "ASC" : "DESC"},a.id LIMIT 101 OFFSET $${offsetParam}`,
    [...values, page * 100],
  );
}

export async function queueBookingMessage(
  tx: Queryable,
  appointment: Appointment,
  kind: "booked" | "cancel" | "reschedule",
) {
  await tx.query(
    "UPDATE reserve_booking_messages SET state='superseded' WHERE appointment_id=$1 AND state IN ('manual_required','failed')",
    [appointment.id],
  );
  await tx.query(
    "INSERT INTO reserve_booking_messages(id,appointment_id,revision,kind) VALUES($1,$2,$3,$4) ON CONFLICT(appointment_id,revision,kind) DO NOTHING",
    [randomUUID(), appointment.id, appointment.revision, kind],
  );
  if (kind !== "cancel")
    await tx.query(
      "INSERT INTO reserve_booking_messages(id,appointment_id,revision,kind,available_at) VALUES($1,$2,$3,'reminder',$4) ON CONFLICT(appointment_id,revision,kind) DO NOTHING",
      [
        randomUUID(),
        appointment.id,
        appointment.revision,
        new Date(
          Math.max(
            Date.now(),
            new Date(appointment.starts_at).getTime() - 86400000,
          ),
        ).toISOString(),
      ],
    );
}
