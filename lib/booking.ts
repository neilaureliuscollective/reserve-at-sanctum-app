import { DateTime } from "luxon";
import { randomUUID } from "node:crypto";
import type { Database, Queryable, Row } from "./db";
export const ZONE = "America/Chicago";
export type Actor = Row & {
  id: string;
  name: string;
  email: string;
  role: "client" | "staff" | "owner";
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
};
export type Appointment = Row & {
  id: string;
  client_id: string;
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
};
export class BookingError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
const iso = (x: Date | string) => new Date(x).toISOString();
export async function catalog(db: Queryable) {
  return db.query<Service>(
    "SELECT s.* FROM reserve_services s JOIN reserve_providers p ON p.id=s.provider_id WHERE s.enabled AND p.enabled ORDER BY s.minutes",
  );
}
async function service(db: Queryable, id: string) {
  const s = (await catalog(db)).find((x) => x.id === id);
  if (!s) throw new BookingError("This service is not available.");
  return s;
}
export function units(start: DateTime, count: number) {
  return Array.from({ length: count / 15 }, (_, i) =>
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
async function validateTime(
  db: Queryable,
  s: Service,
  startISO: string,
  now = DateTime.now(),
  hours?: ProviderHours,
) {
  const start = DateTime.fromISO(startISO, { zone: ZONE }).setZone(ZONE);
  if (
    !start.isValid ||
    start.second !== 0 ||
    start.millisecond !== 0 ||
    start.minute % 15 !== 0
  )
    throw new BookingError("Choose an available appointment time.");
  if (start < now.plus({ hours: 2 }) || start > now.plus({ days: 45 }))
    throw new BookingError(
      "Choose a time between two hours and 45 days from now.",
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
      start.startOf("day").plus({ hours: p.close_hour })
  )
    throw new BookingError("That time is outside studio hours.");
  return start;
}
export async function availability(
  db: Queryable,
  serviceId: string,
  date: string,
  now = DateTime.now(),
) {
  const s = await service(db, serviceId),
    day = DateTime.fromISO(date, { zone: ZONE });
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
  for (let minutes = 0; minutes < 1440; minutes += 15) {
    const start = day.startOf("day").plus({ minutes });
    try {
      await validateTime(db, s, start.toISO()!, now, hours);
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
  return (
    actor.role === "owner" ||
    (actor.role === "staff" && actor.provider_id === a.provider_id) ||
    actor.id === a.client_id
  );
}
async function occupy(
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
export async function book(
  db: Database,
  actor: Actor,
  input: { serviceId: string; start: string; note: string; requestKey: string },
) {
  try {
    return await db.transaction(async (tx) => {
      const [prior] = await tx.query<Appointment>(
        "SELECT * FROM reserve_appointments WHERE client_id=$1 AND request_key=$2",
        [actor.id, input.requestKey],
      );
      if (prior) {
        if (
          prior.service_id !== input.serviceId ||
          iso(prior.original_start) !== iso(input.start) ||
          prior.note !== input.note
        )
          throw new BookingError(
            "This request was already used for another booking.",
            409,
          );
        return prior;
      }
      const s = await service(tx, input.serviceId),
        start = await validateTime(tx, s, input.start),
        id = randomUUID();
      const [a] = await tx.query<Appointment>(
        `INSERT INTO reserve_appointments(id,client_id,provider_id,service_id,starts_at,ends_at,busy_until,price,note,request_key,original_start) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$5) RETURNING *`,
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
        ],
      );
      await occupy(tx, a, start, s.minutes + s.buffer);
      await tx.query(
        "INSERT INTO reserve_audit(actor_id,appointment_id,action) VALUES($1,$2,'booked')",
        [actor.id, id],
      );
      return a;
    });
  } catch (e) {
    return conflict(e);
  }
}
export async function change(
  db: Database,
  actor: Actor,
  id: string,
  input: { action: "cancel" | "reschedule"; start?: string; revision: number },
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
          ...(await service(tx, a.service_id)),
          minutes: originalMinutes,
          buffer,
        };
        start = await validateTime(tx, s, input.start);
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
      return (
        await tx.query<Appointment>(
          "SELECT * FROM reserve_appointments WHERE id=$1",
          [id],
        )
      )[0];
    });
  } catch (e) {
    return conflict(e);
  }
}
export async function visits(db: Queryable, actor: Actor, studio = false) {
  if (studio && actor.role === "client")
    throw new BookingError("Studio access is required.", 403);
  const where = studio
    ? actor.role === "owner"
      ? "TRUE"
      : "a.provider_id=$1"
    : "a.client_id=$1";
  const values =
    studio && actor.role === "owner"
      ? []
      : [studio ? actor.provider_id : actor.id];
  return db.query<Appointment>(
    `SELECT a.*,s.name AS service_name,u.name AS client_name FROM reserve_appointments a JOIN reserve_services s ON s.id=a.service_id JOIN reserve_users u ON u.id=a.client_id WHERE ${where} ORDER BY a.starts_at DESC LIMIT 100`,
    values,
  );
}
