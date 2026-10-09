import { createHash, randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import { z } from "zod";
import { BookingError, type Actor } from "./booking";
import { providerScope } from "./booking-pilot";
import type { Database, Queryable, Row } from "./db";

export const linkKey = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const scheduleInput = z
  .object({
    date: z.iso.date(),
    days: z.coerce.number().int().min(1).max(7).default(1),
    page: z.coerce.number().int().min(0).max(100).default(0),
  })
  .strict();
export type BusinessGrant = Row & {
  id: string;
  user_id: string;
  oauth_client_id: string;
  provider_id: string;
  expires_at: string;
  revoked_at: string | null;
  website_access?: boolean;
};
export const hashLink = (key: string) =>
  createHash("sha256").update(linkKey.parse(key)).digest("hex");
export function businessConfig() {
  if (process.env.RESERVE_BUSINESS_CONNECTIONS_ENABLED !== "true")
    throw new BookingError("Business connections are not activated yet.", 503);
  const client = process.env.AETHELIOS_OAUTH_CLIENT_ID;
  const callback = process.env.AETHELIOS_BUSINESS_CALLBACK;
  if (!client || !callback)
    throw new BookingError("Business connection setup is incomplete.", 503);
  const url = new URL(callback);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/api/business-connections/callback"
  )
    throw new BookingError("Business callback configuration is invalid.", 503);
  return { client, callback: url.href };
}
export function consentRedirect(raw: string, callback: string) {
  const url = new URL(raw),
    base = new URL(callback);
  if (
    url.origin !== base.origin ||
    url.pathname !== base.pathname ||
    url.username ||
    url.password ||
    url.hash ||
    !url.searchParams.get("code")
  )
    throw new BookingError("Authorization return was refused.", 403);
  const key = linkKey.parse(url.searchParams.get("state"));
  return { url: url.href, key };
}
export function verifyBusinessClaims(
  claims: Record<string, unknown>,
  subject: string,
  client: string,
  issuer: string,
) {
  if (
    claims.sub !== subject ||
    claims.client_id !== client ||
    claims.iss !== issuer ||
    claims.aud !== "authenticated" ||
    typeof claims.exp !== "number" ||
    claims.exp * 1000 <= Date.now() ||
    claims.is_anonymous === true
  )
    throw new BookingError("Business authorization is invalid.", 401);
}
export async function grantBusiness(
  db: Database,
  actor: Actor,
  provider: string,
  client: string,
  key: string,
  websiteAccess = false,
) {
  providerScope(actor, provider);
  const [enabled] = await db.query(
    "SELECT id FROM reserve_providers WHERE id=$1 AND enabled",
    [provider],
  );
  if (!enabled)
    throw new BookingError("This professional is not configured yet.", 409);
  return db.transaction(async (tx) => {
    // Serialize consent, cap grants and preserve separate explicitly linked public accounts.
    await tx.query("SELECT id FROM reserve_users WHERE id=$1 FOR UPDATE", [
      actor.id,
    ]);
    const [prior] = await tx.query<BusinessGrant>(
      "SELECT * FROM reserve_business_grants WHERE link_hash=$1",
      [hashLink(key)],
    );
    if (prior) {
      if (
        prior.user_id !== actor.id ||
        prior.provider_id !== provider ||
        prior.oauth_client_id !== client ||
        Boolean(prior.website_access) !== websiteAccess ||
        prior.revoked_at ||
        new Date(prior.expires_at).getTime() <= Date.now()
      )
        throw new BookingError("This connection changed. Start again.", 409);
      return prior;
    }
    const [count] = await tx.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM reserve_business_grants WHERE user_id=$1 AND revoked_at IS NULL AND expires_at>now()",
      [actor.id],
    );
    if (Number(count?.count) >= 10)
      throw new BookingError(
        "Revoke an older connection before adding another.",
        409,
      );
    const id = randomUUID();
    const [grant] = await tx.query<BusinessGrant>(
      "INSERT INTO reserve_business_grants(id,user_id,oauth_client_id,link_hash,provider_id,website_access,expires_at) VALUES($1,$2,$3,$4,$5,$6,now()+interval '30 days') RETURNING *",
      [id, actor.id, client, hashLink(key), provider, websiteAccess],
    );
    await tx.query(
      "INSERT INTO reserve_business_audit(id,grant_id,action) VALUES($1,$2,'consented')",
      [randomUUID(), id],
    );
    return grant;
  });
}
export async function readBusinessGrant(
  db: Queryable,
  actor: Actor,
  client: string,
  key: string,
) {
  const [grant] = await db.query<BusinessGrant>(
    "SELECT * FROM reserve_business_grants WHERE link_hash=$1 AND user_id=$2 AND oauth_client_id=$3 AND revoked_at IS NULL AND expires_at>now()",
    [hashLink(key), actor.id, client],
  );
  if (!grant)
    throw new BookingError(
      "Business access was revoked or expired. Reconnect.",
      403,
    );
  providerScope(actor, grant.provider_id); // Fresh capability and provider assignment on every read.
  return grant;
}
export async function revokeBusiness(db: Queryable, actor: Actor, id: string) {
  const rows = await db.query(
    "UPDATE reserve_business_grants SET revoked_at=now() WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL RETURNING id",
    [id, actor.id],
  );
  if (rows.length)
    await db.query(
      "INSERT INTO reserve_business_audit(id,grant_id,action) VALUES($1,$2,'revoked')",
      [randomUUID(), id],
    );
}
export async function businessIdentity(db: Queryable, grant: BusinessGrant) {
  const [provider] = await db.query<{ name: string; timezone: string }>(
    "SELECT p.name,COALESCE(l.timezone,'America/Chicago') AS timezone FROM reserve_providers p LEFT JOIN reserve_locations l ON l.id=p.location_id WHERE p.id=$1 AND p.enabled",
    [grant.provider_id],
  );
  if (!provider)
    throw new BookingError("Professional setup is unavailable.", 409);
  return {
    grantId: grant.id,
    subject: grant.user_id,
    providerId: grant.provider_id,
    providerName: provider.name,
    timezone: provider.timezone,
    expiresAt: grant.expires_at,
    permissions: grant.website_access
      ? ["bookings.read", "website.read", "website.propose"]
      : ["bookings.read"],
  };
}
export async function businessSchedule(
  db: Queryable,
  actor: Actor,
  grant: BusinessGrant,
  raw: unknown,
) {
  providerScope(actor, grant.provider_id);
  const input = scheduleInput.parse(raw),
    identity = await businessIdentity(db, grant);
  const start = DateTime.fromISO(input.date, {
    zone: identity.timezone,
  }).startOf("day");
  if (!start.isValid) throw new BookingError("Schedule date is invalid.");
  // Dedicated projection, never SELECT a.* or contact/Chair/private note data.
  const rows = await db.query<{
    id: string;
    starts_at: string;
    ends_at: string;
    status: string;
    service: string;
    location: string;
    timezone: string;
  }>(
    `SELECT a.id,a.starts_at,a.ends_at,a.status,s.name AS service,l.name AS location,COALESCE(l.timezone,'America/Chicago') AS timezone FROM reserve_appointments a JOIN reserve_services s ON s.id=a.service_id LEFT JOIN reserve_locations l ON l.id=a.location_id WHERE a.provider_id=$1 AND a.starts_at>=$2 AND a.starts_at<$3 ORDER BY a.starts_at,a.id LIMIT 51 OFFSET $4`,
    [
      grant.provider_id,
      start.toUTC().toISO(),
      start.plus({ days: input.days }).toUTC().toISO(),
      input.page * 50,
    ],
  );
  await db.query(
    "INSERT INTO reserve_business_audit(id,grant_id,action) VALUES($1,$2,'schedule_read')",
    [randomUUID(), grant.id],
  );
  return {
    version: 1 as const,
    source: "Legacy Reserve" as const,
    fetchedAt: new Date().toISOString(),
    providerId: grant.provider_id,
    timezone: identity.timezone,
    date: input.date,
    days: input.days,
    page: input.page,
    hasMore: rows.length > 50,
    appointments: rows
      .slice(0, 50)
      .map((r) => ({
        ...r,
        starts_at: new Date(r.starts_at).toISOString(),
        ends_at: new Date(r.ends_at).toISOString(),
        location: r.location ?? "",
      })),
  };
}

export function publicBusinessDestination() {
  const raw = process.env.AETHELIOS_PUBLIC_ORIGIN;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.hash ||
      url.search ||
      url.pathname !== "/" ||
      url.port
    )
      return null;
    return url.origin + "/app/business-connections";
  } catch {
    return null;
  }
}
export async function hasBusinessConnection(db: Queryable, actor: Actor) {
  if (process.env.RESERVE_BUSINESS_CONNECTIONS_ENABLED !== "true") return false;
  const [row] = await db.query(
    "SELECT id FROM reserve_business_grants WHERE user_id=$1 AND revoked_at IS NULL AND expires_at>now() LIMIT 1",
    [actor.id],
  );
  return Boolean(row);
}
