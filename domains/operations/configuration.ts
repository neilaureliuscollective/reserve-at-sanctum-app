import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import { z } from "zod";
import type { Database, Queryable, Row } from "../../lib/db";
import { BookingError, type Actor } from "../../lib/booking";
import { assignments, permitted, requireAccess } from "../access";
const id = z.string().regex(/^[a-zA-Z0-9:_-]{1,100}$/);
const minute = z
  .number()
  .int()
  .min(0)
  .max(1440)
  .refine((v) => v % 15 === 0);
export const configurationSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("location"),
      id: id.optional(),
      name: z.string().trim().min(1).max(100),
      slug: id,
      timezone: z.string().max(80),
      address: z.string().trim().max(300).default(""),
      contact: z.string().trim().max(200).default(""),
      policy: z.string().trim().max(1000).default(""),
      status: z.enum(["draft", "pilot", "live", "paused"]).default("draft"),
      booking_enabled: z.boolean().default(false),
      notice_minutes: z.number().int().min(0).max(10080).default(120),
      horizon_days: z.number().int().min(1).max(365).default(45),
      cancellation_minutes: z.number().int().min(0).max(10080).default(0),
      revision: z.number().int().min(0).default(0),
    })
    .strict(),
  z
    .object({
      action: z.literal("provider"),
      locationId: id,
      id: id.optional(),
      name: z.string().trim().min(1).max(100),
      slug: id,
      enabled: z.boolean(),
      brand: z.string().trim().max(100).default(""),
    })
    .strict(),
  z
    .object({
      action: z.literal("service"),
      locationId: id,
      id: id.optional(),
      providerId: id,
      name: z.string().trim().min(1).max(100),
      description: z.string().max(500).default(""),
      minutes: z
        .number()
        .int()
        .min(15)
        .max(480)
        .refine((v) => v % 15 === 0),
      buffer: z
        .number()
        .int()
        .min(0)
        .max(120)
        .refine((v) => v % 15 === 0),
      price: z.number().int().min(0).max(1000000),
      enabled: z.boolean(),
      resourceId: id.nullable().default(null),
      revision: z.number().int().min(0).default(0),
    })
    .strict(),
  z
    .object({
      action: z.literal("hours"),
      locationId: id,
      providerId: id.nullable().default(null),
      weekday: z.number().int().min(1).max(7).nullable().default(null),
      day: z.iso.date().nullable().default(null),
      intervals: z
        .array(
          z
            .object({ start: minute, end: minute })
            .strict()
            .refine((v) => v.end > v.start),
        )
        .max(4),
      closed: z.boolean().default(false),
    })
    .strict(),
  z
    .object({
      action: z.literal("resource"),
      locationId: id,
      name: z.string().trim().min(1).max(100),
      id: id.optional(),
      enabled: z.boolean().default(true),
    })
    .strict(),
  z
    .object({
      action: z.literal("access"),
      locationId: id,
      userId: z.uuid(),
      role: z.enum(["manager", "provider", "reception"]),
      providerId: id.nullable().default(null),
      enabled: z.boolean().default(true),
    })
    .strict(),
]);
export async function operatorLocations(db: Queryable, actor: Actor) {
  const scopes = assignments(actor);
  const ids = scopes.map((a) => a.location_id).filter(Boolean);
  return db.query<Row & { id: string; name: string; timezone: string }>(
    "SELECT * FROM reserve_locations WHERE organization_id=ANY($1::text[]) AND ($2::boolean OR id=ANY($3::text[])) ORDER BY name",
    [
      scopes.map((a) => a.organization_id),
      scopes.some((a) => a.role === "owner"),
      ids,
    ],
  );
}
export async function configuration(
  db: Queryable,
  actor: Actor,
  locationId: string,
) {
  const scopes = assignments(actor);
  if (!scopes.some((a) => a.role === "owner" || a.location_id === locationId))
    throw new BookingError("Location access is required.", 403);
  const [location] = await db.query(
    "SELECT * FROM reserve_locations WHERE id=$1",
    [locationId],
  );
  const [providers, services, hours, resources, access] = await Promise.all([
    db.query(
      "SELECT p.*,pl.bookable,b.name AS brand_name FROM reserve_providers p JOIN reserve_provider_locations pl ON pl.provider_id=p.id LEFT JOIN reserve_provider_brands b ON b.provider_id=p.id WHERE pl.location_id=$1 ORDER BY p.name",
      [locationId],
    ),
    db.query(
      "SELECT * FROM reserve_services WHERE location_id=$1 ORDER BY name",
      [locationId],
    ),
    db.query(
      "SELECT * FROM reserve_hours WHERE location_id=$1 ORDER BY day NULLS LAST,weekday,start_minute",
      [locationId],
    ),
    db.query(
      "SELECT * FROM reserve_resources WHERE location_id=$1 ORDER BY name",
      [locationId],
    ),
    permitted(actor, "grant", locationId)
      ? db.query(
          "SELECT a.*,u.name,u.email FROM reserve_access a JOIN reserve_users u ON u.id=a.user_id WHERE a.location_id=$1",
          [locationId],
        )
      : Promise.resolve([]),
  ]);
  return {
    location,
    providers,
    services,
    hours,
    resources,
    access,
    canManage: permitted(actor, "manage", locationId),
    canGrant: permitted(actor, "grant", locationId),
  };
}
export async function configure(db: Database, actor: Actor, raw: unknown) {
  const input = configurationSchema.parse(raw);
  return db.transaction(async (tx) => {
    const locationId =
      input.action === "location" ? input.id || input.slug : input.locationId;
    requireAccess(
      actor,
      input.action === "access"
        ? "grant"
        : input.action === "hours"
          ? "schedule"
          : "catalog",
      locationId,
      input.action === "hours" ? input.providerId || undefined : undefined,
    );
    if (input.action === "location" && !input.id)
      requireAccess(actor, "grant", locationId);
    const [location] = await tx.query<{ organization_id: string }>(
      "SELECT * FROM reserve_locations WHERE id=$1 FOR UPDATE",
      [locationId],
    );
    if (!location && input.action !== "location")
      throw new BookingError("Location not found.", 404);
    const organizationId =
      location?.organization_id ||
      assignments(actor).find((a) => a.role === "owner")!.organization_id;
    let entityId: string = locationId;
    if (input.action === "location") {
      if (!DateTime.now().setZone(input.timezone).isValid)
        throw new BookingError("Choose a valid location timezone.");
      if (
        input.status === "live" &&
        (!input.address || !input.contact || !input.policy)
      )
        throw new BookingError(
          "Approve the address, contact and booking policy before publishing.",
        );
      const rows = await tx.query(
        `INSERT INTO reserve_locations(id,organization_id,slug,name,timezone,address,contact,policy,status,booking_enabled,notice_minutes,horizon_days,cancellation_minutes)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,name=excluded.name,timezone=excluded.timezone,address=excluded.address,contact=excluded.contact,policy=excluded.policy,status=excluded.status,booking_enabled=excluded.booking_enabled,notice_minutes=excluded.notice_minutes,horizon_days=excluded.horizon_days,cancellation_minutes=excluded.cancellation_minutes,revision=reserve_locations.revision+1 WHERE reserve_locations.revision=$14 RETURNING id`,
        [
          locationId,
          organizationId,
          input.slug,
          input.name,
          input.timezone,
          input.address,
          input.contact,
          input.policy,
          input.status,
          input.booking_enabled,
          input.notice_minutes,
          input.horizon_days,
          input.cancellation_minutes,
          input.revision,
        ],
      );
      if (!rows.length)
        throw new BookingError("Location changed. Reload before saving.", 409);
    } else if (input.action === "provider") {
      entityId = input.id || randomUUID();
      const [existing] = await tx.query<{ organization_id: string }>(
        "SELECT organization_id FROM reserve_providers WHERE id=$1",
        [entityId],
      );
      if (existing && existing.organization_id !== organizationId)
        throw new BookingError("Provider not found.", 404);
      // A provider's company-wide identity may only be edited by the owner.
      if (existing) requireAccess(actor, "grant", locationId);
      await tx.query(
        "INSERT INTO reserve_providers(id,name,slug,organization_id,enabled) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET name=excluded.name,slug=excluded.slug,enabled=excluded.enabled",
        [entityId, input.name, input.slug, organizationId, input.enabled],
      );
      await tx.query(
        "INSERT INTO reserve_provider_locations(provider_id,location_id,organization_id,bookable) VALUES($1,$2,$3,$4) ON CONFLICT(provider_id,location_id) DO UPDATE SET bookable=excluded.bookable",
        [entityId, locationId, organizationId, input.enabled],
      );
      if (input.brand)
        await tx.query(
          "INSERT INTO reserve_provider_brands(provider_id,name,slug) VALUES($1,$2,$3) ON CONFLICT(provider_id) DO UPDATE SET name=excluded.name",
          [entityId, input.brand, `${input.slug}-brand`],
        );
    } else if (input.action === "service") {
      entityId = input.id || randomUUID();
      const [existing] = await tx.query<{ location_id: string }>(
        "SELECT location_id FROM reserve_services WHERE id=$1",
        [entityId],
      );
      if (existing && existing.location_id !== locationId)
        throw new BookingError("Service not found.", 404);
      const rows = await tx.query(
        `INSERT INTO reserve_services(id,location_id,organization_id,provider_id,name,description,minutes,buffer,price,enabled,resource_id)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,minutes=excluded.minutes,buffer=excluded.buffer,price=excluded.price,enabled=excluded.enabled,resource_id=excluded.resource_id,revision=reserve_services.revision+1 WHERE reserve_services.revision=$12 AND reserve_services.provider_id=$4 RETURNING id`,
        [
          entityId,
          locationId,
          organizationId,
          input.providerId,
          input.name,
          input.description,
          input.minutes,
          input.buffer,
          input.price,
          input.enabled,
          input.resourceId,
          input.revision,
        ],
      );
      if (!rows.length)
        throw new BookingError("Service changed. Reload before saving.", 409);
    } else if (input.action === "hours") {
      if (!input.day && !input.weekday)
        throw new BookingError("Choose a weekday or exception date.");
      if (input.closed && input.intervals.length)
        throw new BookingError(
          "A closed day cannot contain working intervals.",
        );
      const intervals = [...input.intervals].sort((a, b) => a.start - b.start);
      if (intervals.some((v, i) => i > 0 && v.start < intervals[i - 1].end))
        throw new BookingError("Working intervals overlap.");
      // Existing visits are never silently invalidated by an hours edit.
      const affected = await tx.query<{
        id: string;
        starts_at: Date | string;
        busy_until: Date | string;
      }>(
        `SELECT a.id,a.starts_at,a.busy_until FROM reserve_appointments a JOIN reserve_locations l ON l.id=a.location_id
    WHERE a.location_id=$1 AND ($2::text IS NULL OR a.provider_id=$2) AND a.status IN ('confirmed','checked_in') AND a.busy_until>now()
     AND (($3::date IS NOT NULL AND (a.starts_at AT TIME ZONE l.timezone)::date=$3::date) OR ($3::date IS NULL AND extract(isodow FROM a.starts_at AT TIME ZONE l.timezone)=$4))`,
        [locationId, input.providerId, input.day, input.weekday],
      );
      const [place] = await tx.query<{ timezone: string }>(
        "SELECT timezone FROM reserve_locations WHERE id=$1",
        [locationId],
      );
      if (
        affected.some((a) => {
          const start = DateTime.fromJSDate(new Date(a.starts_at)).setZone(
              place.timezone,
            ),
            end = DateTime.fromJSDate(new Date(a.busy_until)).setZone(
              place.timezone,
            );
          return (
            input.closed ||
            !intervals.some(
              (i) =>
                start.hour * 60 + start.minute >= i.start &&
                end.hour * 60 + end.minute <= i.end &&
                start.toISODate() === end.toISODate(),
            )
          );
        })
      )
        throw new BookingError(
          "These hours would invalidate existing visits. Reschedule those visits first.",
          409,
        );
      await tx.query(
        "DELETE FROM reserve_hours WHERE location_id=$1 AND provider_id IS NOT DISTINCT FROM $2 AND day IS NOT DISTINCT FROM $3::date AND ($3::date IS NOT NULL OR weekday=$4)",
        [locationId, input.providerId, input.day, input.weekday],
      );
      for (const interval of input.closed
        ? [{ start: 0, end: 1440 }]
        : intervals)
        await tx.query(
          "INSERT INTO reserve_hours(id,location_id,provider_id,weekday,day,start_minute,end_minute,closed) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
          [
            randomUUID(),
            locationId,
            input.providerId,
            input.weekday,
            input.day,
            interval.start,
            interval.end,
            input.closed,
          ],
        );
    } else if (input.action === "resource") {
      entityId = input.id || randomUUID();
      const rows = await tx.query(
        "INSERT INTO reserve_resources(id,location_id,name,enabled) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET name=excluded.name,enabled=excluded.enabled WHERE reserve_resources.location_id=$2 RETURNING id",
        [entityId, locationId, input.name, input.enabled],
      );
      if (!rows.length) throw new BookingError("Resource not found.", 404);
    } else {
      const [user] = await tx.query(
        "SELECT id FROM reserve_users WHERE id=$1 AND organization_id=$2 AND identity_verified",
        [input.userId, organizationId],
      );
      if (!user)
        throw new BookingError(
          "Ask this verified account to sign in first.",
          404,
        );
      if ((input.role === "provider") !== Boolean(input.providerId))
        throw new BookingError("A provider assignment requires its provider.");
      if (
        input.providerId &&
        !(await tx
          .query(
            "SELECT provider_id FROM reserve_provider_locations WHERE provider_id=$1 AND location_id=$2",
            [input.providerId, locationId],
          )
          .then((r) => r.length))
      )
        throw new BookingError("Provider is not assigned to this location.");
      entityId = `${input.userId}:${locationId}:${input.role}:${input.providerId || ""}`;
      await tx.query(
        "INSERT INTO reserve_access(id,user_id,organization_id,location_id,provider_id,role,enabled) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO UPDATE SET enabled=excluded.enabled",
        [
          entityId,
          input.userId,
          organizationId,
          locationId,
          input.providerId,
          input.role,
          input.enabled,
        ],
      );
    }
    await tx.query(
      "INSERT INTO reserve_operation_events(actor_id,location_id,entity_id,action) VALUES($1,$2,$3,$4)",
      [actor.id, locationId, entityId, `configured_${input.action}`],
    );
    return { id: entityId };
  });
}
