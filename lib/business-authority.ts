import { BookingError, type Actor } from "./booking";
import type { Database, Queryable } from "./db";

export type BusinessPermission = "appointments.read" | "configuration.manage" | "memberships.revoke" | "payments.associate";
export function businessAuthorityEnabled(env: Record<string,string|undefined> = process.env) {
  return env.RESERVE_BUSINESS_AUTHORITY_ENABLED === "true";
}
/** A verified login is supplied by currentUser(), never by a request body.
 * Global owner and editable capability overrides do not grant tenant access. */
export async function requireBusinessAccess(db: Queryable, actor: Actor, businessId: string, permission: BusinessPermission, env: Record<string,string|undefined> = process.env) {
  if (!businessAuthorityEnabled(env)) throw new BookingError("Business authority has not been commissioned.",503);
  const [membership] = await db.query<{role:string}>(
    `SELECT m.role FROM reserve_business_memberships m JOIN reserve_businesses b ON b.id=m.business_id
     WHERE m.business_id=$1 AND m.user_id=$2 AND m.revoked_at IS NULL AND m.verified_at IS NOT NULL
     AND b.state<>'archived' FOR SHARE OF m,b`,[businessId,actor.id]);
  if (!membership || (permission === "memberships.revoke" && membership.role !== "business_owner") ||
      (permission === "configuration.manage" && !["business_owner","manager"].includes(membership.role)))
    throw new BookingError("Business access is not authorized.",403);
  return membership;
}

/** Explicit selected fields exclude Chair/private grooming notes and unrelated
 * customers. Membership and provider assignments are checked on every request. */
export async function businessAppointments(db: Database, actor: Actor, businessId: string, env: Record<string,string|undefined> = process.env) {
  return db.transaction(async tx => {
    const membership = await requireBusinessAccess(tx,actor,businessId,"appointments.read",env);
    return tx.query(`SELECT a.id,a.provider_id,a.service_id,a.starts_at,a.ends_at,a.busy_until,a.price,a.status,a.revision
      FROM reserve_appointments a JOIN reserve_business_providers bp ON bp.provider_id=a.provider_id
      WHERE bp.business_id=$1 AND ($3::boolean OR EXISTS(SELECT 1 FROM reserve_business_staff_assignments sa
        WHERE sa.business_id=$1 AND sa.user_id=$2 AND sa.provider_id=a.provider_id))
      ORDER BY a.starts_at DESC,a.id LIMIT 200`,[businessId,actor.id,membership.role!=="staff"]);
  });
}

export async function revokeBusinessMembership(db: Database, actor: Actor, businessId: string, userId: string, revision: number, env: Record<string,string|undefined> = process.env) {
  return db.transaction(async tx => {
    // Serialize revocations within a business, including self-revocation and
    // two owners racing, before taking the membership share lock.
    await tx.query("SELECT id FROM reserve_businesses WHERE id=$1 FOR UPDATE",[businessId]);
    await requireBusinessAccess(tx,actor,businessId,"memberships.revoke",env);
    const [target] = await tx.query<{role:string}>("SELECT role FROM reserve_business_memberships WHERE business_id=$1 AND user_id=$2 AND revoked_at IS NULL AND revision=$3 FOR UPDATE",[businessId,userId,revision]);
    if (!target) throw new BookingError("Membership changed. Refresh before retrying.",409);
    if (target.role === "business_owner") {
      const [owners] = await tx.query<{count:number}>("SELECT count(*)::int AS count FROM reserve_business_memberships WHERE business_id=$1 AND role='business_owner' AND revoked_at IS NULL",[businessId]);
      if (owners.count < 2) throw new BookingError("The last verified business owner cannot be revoked.",409);
    }
    await tx.query("UPDATE reserve_business_memberships SET revoked_at=now(),revision=revision+1 WHERE business_id=$1 AND user_id=$2",[businessId,userId]);
    await tx.query("INSERT INTO reserve_business_events(business_id,actor_id,action) VALUES($1,$2,'membership_revoked')",[businessId,actor.id]);
    return { revoked: true };
  });
}
