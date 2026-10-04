import { DateTime } from "luxon";
import { randomUUID } from "node:crypto";
import type { Database, Queryable, Row } from "./db";
import {
  assignments,
  permitted,
  requireAccess,
  visitScope,
  type Assignment,
} from "../domains/access";
import {
  offering,
  available,
  validateSlot,
} from "../domains/scheduling/calendar";
import { ownCustomer, type Customer } from "../domains/customers";
export const ZONE = "America/Chicago";
export type Actor = Row & {
  id: string;
  name: string;
  email: string;
  role: "client" | "staff" | "owner";
  provider_id: string | null;
  assignments?: Assignment[];
};
export type Service = Row & {
  id: string;
  name: string;
  description: string;
  provider_id: string;
  minutes: number;
  buffer: number;
  price: number;
  timezone?: string;
  provider_name?: string;
  location_name?: string;
  brand_name?: string;
  location_id?: string;
};
export type Appointment = Row & {
  id: string;
  client_id: string | null;
  customer_id: string;
  location_id: string;
  organization_id: string;
  snapshot: {
    service?: string;
    provider?: string;
    location?: string;
    resourceId?: string | null;
    timezone?: string;
    currency?: string;
  };
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
export async function catalog(
  db: Queryable,
  locationId?: string,
  providerId?: string,
) {
  return db.query<Service>(
    `SELECT s.*,p.name AS provider_name,l.name AS location_name,l.timezone,b.name AS brand_name,l.status AS location_status
    FROM reserve_services s JOIN reserve_providers p ON p.id=s.provider_id
    JOIN reserve_locations l ON l.id=s.location_id
    JOIN reserve_provider_locations pl ON pl.provider_id=s.provider_id AND pl.location_id=s.location_id
    LEFT JOIN reserve_provider_brands b ON b.provider_id=p.id
    WHERE s.enabled AND p.enabled AND pl.bookable AND l.booking_enabled AND l.status IN ('pilot','live')
      AND ($1::text IS NULL OR l.id=$1 OR l.slug=$1) AND ($2::text IS NULL OR p.id=$2 OR p.slug=$2)
    ORDER BY l.name,p.name,s.minutes`,
    [locationId || null, providerId || null],
  );
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
export async function availability(
  db: Queryable,
  serviceId: string,
  date: string,
  now = DateTime.now(),
  staff = false,
) {
  return available(db, await offering(db, serviceId), date, now, staff);
}
export function canAccess(actor: Actor, a: Appointment) {
  return (
    actor.id === a.client_id ||
    permitted(
      actor,
      "schedule",
      a.location_id || "eunice",
      a.provider_id,
      a.organization_id || "reserve",
    )
  );
}
async function occupy(
  tx: Queryable,
  a: Appointment,
  start: DateTime,
  minutes: number,
  resourceId: string | null,
) {
  for (const u of units(start, minutes)) {
    await tx.query(
      "INSERT INTO reserve_occupancy(provider_id,starts_at,appointment_id) VALUES($1,$2,$3)",
      [a.provider_id, u, a.id],
    );
    if (resourceId)
      await tx.query(
        "INSERT INTO reserve_resource_occupancy(resource_id,starts_at,appointment_id) VALUES($1,$2,$3)",
        [resourceId, u, a.id],
      );
  }
}
function conflict(e: unknown): never {
  if ((e as { code?: string }).code === "23505")
    throw new BookingError(
      "That time was just taken. Please choose another.",
      409,
    );
  throw e;
}
async function event(
  tx: Queryable,
  actor: Actor,
  a: Appointment,
  action: string,
) {
  await tx.query(
    "INSERT INTO reserve_audit(actor_id,appointment_id,action) VALUES($1,$2,$3)",
    [actor.id, a.id, action],
  );
  await tx.query(
    "INSERT INTO reserve_operation_events(actor_id,location_id,entity_id,action) VALUES($1,$2,$3,$4)",
    [actor.id, a.location_id, a.id, action],
  );
  const kind =
    action === "booked"
      ? "confirmed"
      : action === "reschedule"
        ? "rescheduled"
        : action === "cancel"
          ? "cancelled"
          : null;
  if (kind) {
    await tx.query(
      "UPDATE reserve_outbox SET state='suppressed' WHERE appointment_id=$1 AND state IN ('pending','failed')",
      [a.id],
    );
    await tx.query(
      "INSERT INTO reserve_outbox(id,appointment_id,revision,kind) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
      [randomUUID(), a.id, a.revision, kind],
    );
    if (kind !== "cancelled")
      await tx.query(
        "INSERT INTO reserve_outbox(id,appointment_id,revision,kind,due_at) VALUES($1,$2,$3,'reminder',$4::timestamptz-interval '24 hours') ON CONFLICT DO NOTHING",
        [randomUUID(), a.id, a.revision, a.starts_at],
      );
  }
}
export async function book(
  db: Database,
  actor: Actor,
  input: {
    serviceId: string;
    start: string;
    note: string;
    requestKey: string;
    customerId?: string;
  },
) {
  try {
    return await db.transaction(async (tx) => {
      const [retry] = await tx.query<Appointment>(
        "SELECT * FROM reserve_appointments WHERE created_by=$1 AND request_key=$2",
        [actor.id, input.requestKey],
      );
      if (retry) {
        if (
          retry.service_id !== input.serviceId ||
          iso(retry.original_start) !== iso(input.start) ||
          retry.note !== input.note ||
          (input.customerId
            ? retry.customer_id !== input.customerId
            : retry.client_id !== actor.id)
        )
          throw new BookingError(
            "This request was already used for another booking.",
            409,
          );
        if (!canAccess(actor, retry))
          throw new BookingError("Appointment not found.", 404);
        return retry;
      }
      const s = await offering(tx, input.serviceId, true);
      if (input.customerId)
        requireAccess(
          actor,
          "schedule",
          s.location_id,
          s.provider_id,
          s.organization_id,
        );
      const customer = input.customerId
        ? (
            await tx.query<Customer>(
              `SELECT c.* FROM reserve_customers c JOIN reserve_customer_locations cl ON cl.customer_id=c.id WHERE c.id=$1 AND cl.location_id=$2 AND c.organization_id=$3`,
              [input.customerId, s.location_id, s.organization_id],
            )
          )[0]
        : await ownCustomer(tx, actor);
      if (!customer || customer.organization_id !== s.organization_id)
        throw new BookingError("Customer not found.", 404);
      if (
        input.customerId &&
        !permitted(actor, "manage", s.location_id) &&
        customer.auth_user_id !== actor.id
      ) {
        const [relationship] = await tx.query(
          "SELECT id FROM reserve_appointments WHERE customer_id=$1 AND provider_id=$2 AND location_id=$3 LIMIT 1",
          [customer.id, s.provider_id, s.location_id],
        );
        // A fresh guest created in this operation is permitted through an explicit provider relationship.
        const [created] = await tx.query(
          "SELECT id FROM reserve_operation_events WHERE entity_id=$1 AND actor_id=$2 AND action='customer_created'",
          [customer.id, actor.id],
        );
        if (!relationship && !created)
          throw new BookingError("Customer not found.", 404);
      }
      const [prior] = await tx.query<Appointment>(
        "SELECT * FROM reserve_appointments WHERE created_by=$1 AND request_key=$2",
        [actor.id, input.requestKey],
      );
      if (prior) {
        if (
          prior.service_id !== input.serviceId ||
          iso(prior.original_start) !== iso(input.start) ||
          prior.note !== input.note ||
          prior.customer_id !== customer.id
        )
          throw new BookingError(
            "This request was already used for another booking.",
            409,
          );
        return prior;
      }
      const start = await validateSlot(
        tx,
        s,
        input.start,
        DateTime.now(),
        Boolean(input.customerId),
      );
      const snapshot = {
        service: s.name,
        provider: s.provider_name,
        location: s.location_name,
        brand: s.brand_name,
        timezone: s.timezone,
        currency: s.currency,
        policy: s.policy,
        offeringRevision: s.revision,
        resourceId: s.resource_id,
      };
      const [a] = await tx.query<Appointment>(
        `INSERT INTO reserve_appointments(id,client_id,customer_id,provider_id,service_id,location_id,organization_id,created_by,starts_at,ends_at,busy_until,price,note,request_key,original_start,snapshot)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$9,$15::jsonb) RETURNING *`,
        [
          randomUUID(),
          customer.auth_user_id,
          customer.id,
          s.provider_id,
          s.id,
          s.location_id,
          s.organization_id,
          actor.id,
          start.toUTC().toISO(),
          start.plus({ minutes: s.minutes }).toUTC().toISO(),
          start
            .plus({ minutes: s.minutes + s.buffer })
            .toUTC()
            .toISO(),
          s.price,
          input.note,
          input.requestKey,
          JSON.stringify(snapshot),
        ],
      );
      await tx.query(
        "INSERT INTO reserve_customer_locations(customer_id,location_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [customer.id, s.location_id],
      );
      await occupy(tx, a, start, s.minutes + s.buffer, s.resource_id);
      await event(tx, actor, a, "booked");
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
  input: {
    action: "cancel" | "reschedule" | "check_in" | "complete" | "no_show";
    start?: string;
    revision: number;
  },
) {
  try {
    return await db.transaction(async (tx) => {
      // Use the same lock order as new bookings and schedule configuration.
      await tx.query(
        "SELECT l.id FROM reserve_locations l JOIN reserve_appointments a ON a.location_id=l.id WHERE a.id=$1 FOR UPDATE OF l",
        [id],
      );
      const [a] = await tx.query<Appointment>(
        "SELECT * FROM reserve_appointments WHERE id=$1 FOR UPDATE",
        [id],
      );
      if (!a || !canAccess(actor, a))
        throw new BookingError("Appointment not found.", 404);
      if (a.revision !== input.revision)
        throw new BookingError(
          "This visit changed. Refresh before making another change.",
          409,
        );
      const operator = permitted(
        actor,
        "schedule",
        a.location_id,
        a.provider_id,
        a.organization_id,
      );
      if (input.action === "cancel" || input.action === "reschedule") {
        if (a.status !== "confirmed")
          throw new BookingError("This appointment is no longer active.", 409);
        if (new Date(a.starts_at).getTime() < Date.now())
          throw new BookingError("Past visits cannot be changed.");
        const [location] = await tx.query<{ cancellation_minutes: number }>(
          "SELECT cancellation_minutes FROM reserve_locations WHERE id=$1",
          [a.location_id],
        );
        if (
          !operator &&
          new Date(a.starts_at).getTime() <
            Date.now() + location.cancellation_minutes * 60000
        )
          throw new BookingError("Contact the location to change this visit.");
        if (input.action === "reschedule") {
          if (!input.start) throw new BookingError("Choose a new time.");
          const duration =
            (new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime()) /
            60000;
          const buffer =
            (new Date(a.busy_until).getTime() - new Date(a.ends_at).getTime()) /
            60000;
          const current = await offering(tx, a.service_id);
          const s = {
            ...current,
            minutes: duration,
            buffer,
            resource_id: a.snapshot.resourceId || null,
          };
          const start = await validateSlot(
            tx,
            s,
            input.start,
            DateTime.now(),
            operator,
          );
          await tx.query(
            "DELETE FROM reserve_occupancy WHERE appointment_id=$1",
            [id],
          );
          await tx.query(
            "DELETE FROM reserve_resource_occupancy WHERE appointment_id=$1",
            [id],
          );
          await occupy(tx, a, start, duration + buffer, s.resource_id);
          await tx.query(
            "UPDATE reserve_appointments SET starts_at=$1,ends_at=$2,busy_until=$3,revision=revision+1 WHERE id=$4",
            [
              start.toUTC().toISO(),
              start.plus({ minutes: duration }).toUTC().toISO(),
              start
                .plus({ minutes: duration + buffer })
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
            "DELETE FROM reserve_resource_occupancy WHERE appointment_id=$1",
            [id],
          );
          await tx.query(
            "UPDATE reserve_appointments SET status='cancelled',revision=revision+1 WHERE id=$1",
            [id],
          );
        }
      } else {
        if (!operator)
          throw new BookingError("Studio access is required.", 403);
        const valid =
          input.action === "check_in"
            ? a.status === "confirmed"
            : input.action === "complete"
              ? a.status === "checked_in"
              : a.status === "confirmed";
        if (!valid)
          throw new BookingError(
            "This visit cannot make that transition.",
            409,
          );
        if (
          input.action === "no_show" &&
          new Date(a.starts_at).getTime() > Date.now() - 15 * 60000
        )
          throw new BookingError(
            "Wait until fifteen minutes after the scheduled arrival.",
          );
        if (
          input.action === "check_in" &&
          new Date(a.starts_at).getTime() > Date.now() + 60 * 60000
        )
          throw new BookingError("Check-in opens one hour before the visit.");
        const status =
          input.action === "check_in"
            ? "checked_in"
            : input.action === "complete"
              ? "completed"
              : "no_show";
        await tx.query(
          "UPDATE reserve_appointments SET status=$1,revision=revision+1 WHERE id=$2",
          [status, id],
        );
        await tx.query(
          "UPDATE reserve_outbox SET state='suppressed' WHERE appointment_id=$1 AND state IN ('pending','failed')",
          [id],
        );
      }
      const [updated] = await tx.query<Appointment>(
        "SELECT * FROM reserve_appointments WHERE id=$1",
        [id],
      );
      await event(tx, actor, updated, input.action);
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
  filters: {
    locationId?: string;
    providerId?: string;
    date?: string;
    cursor?: string;
    limit?: number;
  } = {},
) {
  if (studio && !assignments(actor).length)
    throw new BookingError("Studio access is required.", 403);
  const scope = studio
    ? visitScope(actor)
    : { where: "a.client_id=$1", values: [actor.id] as unknown[] };
  const bind = (v: unknown) => {
    scope.values.push(v);
    return `$${scope.values.length}`;
  };
  let where = scope.where;
  if (filters.locationId)
    where += ` AND a.location_id=${bind(filters.locationId)}`;
  if (filters.providerId)
    where += ` AND a.provider_id=${bind(filters.providerId)}`;
  if (filters.date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(filters.date))
      throw new BookingError("Choose a valid date.");
    where += ` AND (a.starts_at AT TIME ZONE l.timezone)::date=${bind(filters.date)}::date`;
  }
  if (filters.cursor) {
    const [cursor] = await db.query<{ starts_at: Date | string }>(
      "SELECT starts_at FROM reserve_appointments WHERE id=$1",
      [filters.cursor],
    );
    const [cursorVisit] = await db.query<Appointment>(
      "SELECT * FROM reserve_appointments WHERE id=$1",
      [filters.cursor],
    );
    if (!cursor || !cursorVisit || !canAccess(actor, cursorVisit))
      throw new BookingError("Invalid page cursor.");
    where += ` AND (a.starts_at,a.id)<(${bind(cursor.starts_at)}::timestamptz,${bind(filters.cursor)})`;
  }
  const limit = Math.min(Math.max(filters.limit || 100, 1), 100);
  return db.query<Appointment>(
    `SELECT a.*,COALESCE(a.snapshot->>'service',s.name) AS service_name,c.name AS client_name,
    a.snapshot->>'provider' AS provider_name,a.snapshot->>'location' AS location_name,l.timezone
    FROM reserve_appointments a JOIN reserve_services s ON s.id=a.service_id JOIN reserve_customers c ON c.id=a.customer_id
    JOIN reserve_locations l ON l.id=a.location_id WHERE ${where} ORDER BY a.starts_at DESC,a.id DESC LIMIT ${limit}`,
    scope.values,
  );
}
