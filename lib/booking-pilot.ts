import { z } from "zod";
import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import {
  BookingError,
  type Actor,
  type Appointment,
  service,
  serviceLocation,
  validateTime,
  occupy,
  queueBookingMessage,
} from "./booking";
import type { Database, Queryable, Row } from "./db";
import { requireCapability } from "./studio-permissions";

export function providerScope(actor: Actor, provider?: string) {
  requireCapability(actor, "appointments.read");
  const id = provider || actor.provider_id;
  if (!id || (actor.role !== "owner" && actor.provider_id !== id))
    throw new BookingError("Provider access is required.", 403);
  return id;
}
export const clientInput = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z.union([z.email(), z.literal("")]).default(""),
    phone: z.string().trim().max(30).default(""),
    source: z.string().trim().min(1).max(80).default("manual"),
    sourceKey: z.string().trim().min(1).max(120),
    allowDuplicate: z.boolean().default(false),
  })
  .strict();
export type ClientInput = z.infer<typeof clientInput>;
export type PilotClient = Row & {
  id: string;
  provider_id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string;
  revision: number;
};
export function normalizePhone(value: string) {
  if (!value) return "";
  const digits = value.replace(/[^0-9]/g, "");
  if (digits.length === 10) return "+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  if (value.startsWith("+") && digits.length >= 8 && digits.length <= 15)
    return "+" + digits;
  throw new BookingError(
    "Use a ten-digit US phone number or an international number beginning with +.",
  );
}
export function normalizedClient(raw: unknown) {
  const input = clientInput.parse(raw);
  if (input.source === "account")
    throw new BookingError(
      "The account source is reserved for verified sign-ins.",
    );
  return {
    ...input,
    email: input.email.toLowerCase(),
    phone: normalizePhone(input.phone),
  };
}
export async function updatePilotClient(
  db: Queryable,
  actor: Actor,
  id: string,
  raw: unknown,
) {
  requireCapability(actor, "appointments.manage");
  const input = z
    .object({
      name: z.string().trim().min(1).max(100),
      email: z.union([z.email(), z.literal("")]),
      phone: z.string().max(30),
      revision: z.number().int().positive(),
    })
    .strict()
    .parse(raw);
  const [client] = await db.query<PilotClient>(
    "SELECT * FROM reserve_clients WHERE id=$1",
    [id],
  );
  if (!client) throw new BookingError("Client not found.", 404);
  providerScope(actor, client.provider_id);
  const rows = await db.query(
    "UPDATE reserve_clients SET name=$2,email=$3,phone=$4,revision=revision+1,updated_at=now() WHERE id=$1 AND revision=$5 RETURNING id",
    [
      id,
      input.name,
      input.email.toLowerCase(),
      normalizePhone(input.phone),
      input.revision,
    ],
  );
  if (!rows.length)
    throw new BookingError("This client changed. Refresh before saving.", 409);
}
export async function matchingClients(
  db: Queryable,
  provider: string,
  input: ReturnType<typeof normalizedClient>,
) {
  return db.query<PilotClient>(
    "SELECT * FROM reserve_clients WHERE provider_id=$1 AND (($2<>'' AND email=$2) OR ($3<>'' AND phone=$3)) ORDER BY name,id LIMIT 20",
    [provider, input.email, input.phone],
  );
}
async function createClientTx(
  tx: Queryable,
  actor: Actor,
  provider: string,
  raw: unknown,
) {
  const input = normalizedClient(raw);
  const [p] = await tx.query(
    "SELECT id FROM reserve_providers WHERE id=$1 FOR UPDATE",
    [provider],
  );
  if (!p)
    throw new BookingError(
      "Provider setup is needed before adding clients.",
      409,
    );
  const [prior] = await tx.query<PilotClient>(
    "SELECT * FROM reserve_clients WHERE provider_id=$1 AND source=$2 AND source_key=$3",
    [provider, input.source, input.sourceKey],
  );
  if (prior) {
    if (
      prior.name !== input.name ||
      prior.email !== input.email ||
      prior.phone !== input.phone
    )
      throw new BookingError(
        "This source reference already has different client details. Review it before importing.",
        409,
      );
    return { client: prior, reused: true };
  }
  const matches = await matchingClients(tx, provider, input);
  if (matches.length && !input.allowDuplicate)
    throw new BookingError(
      "A client already uses this email or phone. Choose the existing record, or explicitly confirm a separate client.",
      409,
    );
  const [client] = await tx.query<PilotClient>(
    "INSERT INTO reserve_clients(id,provider_id,name,email,phone,source,source_key,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
    [
      randomUUID(),
      provider,
      input.name,
      input.email,
      input.phone,
      input.source,
      input.sourceKey,
      actor.id,
    ],
  );
  return { client, reused: false };
}
export async function createPilotClient(
  db: Database,
  actor: Actor,
  provider: string,
  raw: unknown,
) {
  requireCapability(actor, "appointments.manage");
  const id = providerScope(actor, provider);
  return db.transaction((tx) => createClientTx(tx, actor, id, raw));
}
export async function pilotClients(
  db: Queryable,
  actor: Actor,
  provider?: string,
  q = "",
  page = 0,
) {
  requireCapability(actor, "clients.read");
  const id = providerScope(actor, provider);
  return db.query<PilotClient>(
    "SELECT * FROM reserve_clients WHERE provider_id=$1 AND ($2='' OR name ILIKE '%'||$2||'%' OR email ILIKE '%'||$2||'%' OR phone ILIKE '%'||$2||'%') ORDER BY name,id LIMIT 31 OFFSET $3",
    [id, q.slice(0, 100), page * 30],
  );
}
export async function pilotHistory(
  db: Queryable,
  actor: Actor,
  id: string,
  page = 0,
) {
  requireCapability(actor, "clients.read");
  const [client] = await db.query<PilotClient>(
    "SELECT * FROM reserve_clients WHERE id=$1",
    [id],
  );
  if (!client) throw new BookingError("Client not found.", 404);
  providerScope(actor, client.provider_id);
  const visits = await db.query(
    "SELECT a.*,s.name AS service_name FROM reserve_appointments a JOIN reserve_services s ON s.id=a.service_id WHERE a.provider_id=$1 AND (a.crm_client_id=$2 OR ($3::text IS NOT NULL AND a.client_id=$3)) ORDER BY a.starts_at DESC,a.id LIMIT 31 OFFSET $4",
    [client.provider_id, id, client.user_id, page * 30],
  );
  return { client, visits: visits.slice(0, 30), hasMore: visits.length > 30 };
}
export async function importPilotClients(
  db: Database,
  actor: Actor,
  provider: string,
  source: string,
  rows: unknown[],
  apply = false,
) {
  requireCapability(actor, "appointments.manage");
  const id = providerScope(actor, provider);
  const inputs = rows.map((r) =>
    normalizedClient({ ...(r as object), source }),
  );
  if (
    inputs.length > 20 ||
    new Set(inputs.map((r) => r.sourceKey)).size !== inputs.length
  )
    throw new BookingError(
      "Import up to 20 rows with unique source references.",
    );
  if (!apply) {
    const preview = [];
    const seen = new Set<string>();
    for (const input of inputs) {
      const contacts = [
        input.email && "email:" + input.email,
        input.phone && "phone:" + input.phone,
      ].filter(Boolean);
      const batchDuplicate = contacts.some((k) => seen.has(k));
      contacts.forEach((k) => seen.add(k));
      const [prior] = await db.query<PilotClient>(
        "SELECT * FROM reserve_clients WHERE provider_id=$1 AND source=$2 AND source_key=$3",
        [id, source, input.sourceKey],
      );
      const matches = await matchingClients(db, id, input);
      preview.push({
        input,
        matches,
        batchDuplicate,
        alreadyImported: !!prior,
      });
    }
    return { preview };
  }
  // Entire batch rolls back on ambiguity or invalid input. Repeats are idempotent.
  return db.transaction(async (tx) => {
    const result = [];
    for (const input of inputs)
      result.push(await createClientTx(tx, actor, id, input));
    await tx.query(
      "INSERT INTO reserve_client_imports(id,provider_id,source,created_by,summary) VALUES($1,$2,$3,$4,$5)",
      [
        randomUUID(),
        id,
        source,
        actor.id,
        JSON.stringify({
          rows: result.length,
          created: result.filter((r) => !r.reused).length,
        }),
      ],
    );
    return {
      created: result.filter((r) => !r.reused).length,
      reused: result.filter((r) => r.reused).length,
    };
  });
}
export const manualInput = z
  .object({
    provider: z.string().min(1).max(80),
    clientId: z.string().min(1).max(200),
    serviceId: z.string().min(1).max(100),
    locationId: z.string().min(1).max(80),
    start: z.iso.datetime({ offset: true }),
    note: z.string().max(600).default(""),
    requestKey: z.uuid(),
  })
  .strict();
export async function manualAppointment(
  db: Database,
  actor: Actor,
  raw: unknown,
) {
  requireCapability(actor, "appointments.manage");
  const input = manualInput.parse(raw),
    provider = providerScope(actor, input.provider);
  try {
    return await db.transaction(async (tx) => {
      // Lock provider first; concurrent same-key retries wait, then return the stored row.
      await tx.query(
        "SELECT id FROM reserve_providers WHERE id=$1 FOR UPDATE",
        [provider],
      );
      const [prior] = await tx.query<Appointment>(
        "SELECT * FROM reserve_appointments WHERE created_by=$1 AND request_key=$2 AND source='manual'",
        [actor.id, input.requestKey],
      );
      if (prior) {
        if (
          prior.crm_client_id !== input.clientId ||
          prior.provider_id !== provider ||
          prior.service_id !== input.serviceId ||
          prior.location_id !== input.locationId ||
          new Date(prior.original_start).toISOString() !==
            new Date(input.start).toISOString() ||
          prior.note !== input.note
        )
          throw new BookingError(
            "This request was already used for another booking.",
            409,
          );
        return prior;
      }
      const [client] = await tx.query<PilotClient>(
        "SELECT * FROM reserve_clients WHERE id=$1 AND provider_id=$2 FOR SHARE",
        [input.clientId, provider],
      );
      if (!client)
        throw new BookingError(
          "Client not found in this provider's records.",
          404,
        );
      const s = await serviceLocation(
        tx,
        await service(tx, input.serviceId, true),
        input.locationId,
        true,
      );
      if (s.provider_id !== provider)
        throw new BookingError("This service is outside your provider.", 403);
      const start = await validateTime(
        tx,
        s,
        input.start,
        DateTime.now(),
        undefined,
        true,
      );
      const [a] = await tx.query<Appointment>(
        "INSERT INTO reserve_appointments(id,client_id,crm_client_id,provider_id,service_id,starts_at,ends_at,busy_until,price,note,request_key,original_start,location_id,created_by,source) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$6,$12,$13,'manual') RETURNING *",
        [
          randomUUID(),
          client.user_id,
          client.id,
          provider,
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
          actor.id,
        ],
      );
      await occupy(tx, a, start, s.minutes + s.buffer);
      await queueBookingMessage(tx, a, "booked");
      await tx.query(
        "INSERT INTO reserve_audit(actor_id,appointment_id,action) VALUES($1,$2,'manual_booked')",
        [actor.id, a.id],
      );
      return a;
    });
  } catch (e) {
    if ((e as { code?: string }).code === "23505")
      throw new BookingError(
        "That time was just taken. Please choose another.",
        409,
      );
    throw e;
  }
}
export async function pilotSetup(db: Queryable, actor: Actor) {
  requireCapability(actor, "appointments.read");
  const args = actor.role === "owner" ? [] : [actor.provider_id];
  const providers = await db.query(
    "SELECT * FROM reserve_providers WHERE " +
      (args.length ? "id=$1" : "TRUE") +
      " ORDER BY name",
    args,
  );
  const locations = await db.query(
    "SELECT id,name,short_name,timezone,address,enabled,booking_enabled FROM reserve_locations ORDER BY name",
  );
  const services = await db.query(
    "SELECT * FROM reserve_services WHERE " +
      (args.length ? "provider_id=$1" : "TRUE") +
      " ORDER BY name",
    args,
  );
  const assignments = await db.query(
    "SELECT * FROM reserve_provider_locations WHERE " +
      (args.length ? "provider_id=$1" : "TRUE"),
    args,
  );
  const staff = await db.query(
    "SELECT provider_id,count(*)::int AS count FROM reserve_users WHERE role IN ('staff','operator') " +
      (args.length ? "AND provider_id=$1" : "") +
      " GROUP BY provider_id",
    args,
  );
  return {
    providers,
    locations,
    services,
    assignments,
    staff,
    owner: actor.role === "owner",
    notificationMode: "manual",
  };
}
export async function configurePilotLocation(
  db: Database,
  actor: Actor,
  raw: unknown,
) {
  requireCapability(actor, "operations.configure");
  const input = z
    .object({
      id: z.string().min(1).max(80),
      address: z.string().trim().min(1).max(300),
      bookingEnabled: z.boolean(),
      acknowledge: z.literal(true),
    })
    .strict()
    .parse(raw);
  return db.transaction(async (tx) => {
    if (input.bookingEnabled) {
      const rows = await tx.query(
        "SELECT p.id FROM reserve_providers p JOIN reserve_provider_locations pl ON pl.provider_id=p.id WHERE pl.location_id=$1 AND p.enabled AND EXISTS(SELECT 1 FROM reserve_services s WHERE s.provider_id=p.id AND s.enabled) AND EXISTS(SELECT 1 FROM reserve_users u WHERE u.provider_id=p.id AND u.role IN ('staff','operator'))",
        [input.id],
      );
      if (!rows.length)
        throw new BookingError(
          "Configure an enabled provider, service and verified staff account before opening booking.",
          409,
        );
    }
    const rows = await tx.query(
      "UPDATE reserve_locations SET address=$2,enabled=$3,booking_enabled=$3,status=CASE WHEN $3 THEN 'operating' ELSE status END WHERE id=$1 RETURNING id",
      [input.id, input.address, input.bookingEnabled],
    );
    if (!rows.length) throw new BookingError("Location not found.", 404);
    await tx.query(
      "INSERT INTO reserve_audit(actor_id,appointment_id,action) VALUES($1,$2,$3)",
      [
        actor.id,
        "location:" + input.id,
        input.bookingEnabled ? "booking_opened" : "booking_closed",
      ],
    );
  });
}
export async function bookingMessages(db: Queryable, actor: Actor) {
  requireCapability(actor, "appointments.read");
  return db.query(
    "SELECT m.*,COALESCE(c.name,u.name) AS client_name,c.phone,COALESCE(NULLIF(c.email,''),u.email) AS email,a.provider_id,a.starts_at,s.name AS service_name FROM reserve_booking_messages m JOIN reserve_appointments a ON a.id=m.appointment_id JOIN reserve_services s ON s.id=a.service_id LEFT JOIN reserve_clients c ON c.id=a.crm_client_id LEFT JOIN reserve_users u ON u.id=a.client_id WHERE m.state='manual_required' AND m.available_at<=now() " +
      (actor.role === "owner" ? "" : "AND a.provider_id=$1") +
      " ORDER BY m.created_at LIMIT 50",
    actor.role === "owner" ? [] : [actor.provider_id],
  );
}
export async function confirmManualMessage(
  db: Queryable,
  actor: Actor,
  id: string,
) {
  requireCapability(actor, "appointments.manage");
  const rows = await db.query(
    "UPDATE reserve_booking_messages m SET state='confirmed_manual',handled_by=$1,handled_at=now() FROM reserve_appointments a WHERE m.id=$2 AND a.id=m.appointment_id AND m.state='manual_required' " +
      (actor.role === "owner" ? "" : "AND a.provider_id=$3") +
      " RETURNING m.id",
    actor.role === "owner" ? [actor.id, id] : [actor.id, id, actor.provider_id],
  );
  if (!rows.length)
    throw new BookingError("Message unavailable or already handled.", 409);
}
export async function configurePilotStaff(
  db: Database,
  actor: Actor,
  raw: unknown,
) {
  requireCapability(actor, "users.admin");
  const input = z
    .object({
      email: z.email(),
      provider: z.string().min(1).max(80),
      acknowledge: z.literal(true),
    })
    .strict()
    .parse(raw);
  return db.transaction(async (tx) => {
    const [provider] = await tx.query(
      "SELECT id FROM reserve_providers WHERE id=$1",
      [input.provider],
    );
    if (!provider)
      throw new BookingError("Create the professional first.", 409);
    const [verified] = await tx.query<{ id: string }>(
      "SELECT id::text AS id FROM auth.users WHERE lower(email)=lower($1) AND email_confirmed_at IS NOT NULL",
      [input.email],
    );
    if (!verified)
      throw new BookingError(
        "This email needs a confirmed account before staff access can be assigned.",
        409,
      );
    const [user] = await tx.query<{ role: string; provider_id: string | null }>(
      "SELECT role,provider_id FROM reserve_users WHERE id=$1 FOR UPDATE",
      [verified.id],
    );
    if (!user)
      throw new BookingError(
        "This person must sign in to Legacy Reserve first.",
        409,
      );
    if (
      user.role !== "client" &&
      !(
        ["operator", "staff"].includes(user.role) &&
        user.provider_id === input.provider
      )
    )
      throw new BookingError(
        "This account already has a different privileged assignment.",
        409,
      );
    await tx.query(
      "UPDATE reserve_users SET role='operator',provider_id=$2 WHERE id=$1",
      [verified.id, input.provider],
    );
    await tx.query(
      "INSERT INTO reserve_audit(actor_id,appointment_id,action) VALUES($1,$2,'staff_assigned')",
      [actor.id, "provider:" + input.provider],
    );
  });
}
