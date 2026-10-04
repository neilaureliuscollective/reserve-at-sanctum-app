import type { Actor } from "../../lib/booking";
import { BookingError } from "../../lib/booking";
import type { Queryable, Row } from "../../lib/db";

export type Assignment = Row & {
  organization_id: string;
  location_id: string | null;
  provider_id: string | null;
  role: "owner" | "manager" | "provider" | "reception";
};
export type Capability =
  | "schedule"
  | "manage"
  | "catalog"
  | "collect"
  | "notes"
  | "grant";
export function assignments(actor: Actor): Assignment[] {
  // Compatibility for isolated fixtures only. Verified HTTP actors always load explicit DB assignments.
  if (actor.assignments) return actor.assignments;
  if (actor.role === "owner")
    return [
      {
        organization_id: "reserve",
        location_id: null,
        provider_id: null,
        role: "owner",
      },
    ];
  if (actor.role === "staff" && actor.provider_id)
    return [
      {
        organization_id: "reserve",
        location_id: "eunice",
        provider_id: actor.provider_id,
        role: "provider",
      },
    ];
  return [];
}
export function permitted(
  actor: Actor,
  capability: Capability,
  locationId: string,
  providerId?: string,
  organizationId = "reserve",
) {
  return assignments(actor).some((a) => {
    if (a.organization_id !== organizationId) return false;
    if (a.role === "owner") return capability !== "notes";
    if (a.location_id !== locationId || capability === "grant") return false;
    if (capability === "notes")
      return a.role === "provider" && a.provider_id === providerId;
    if (a.role === "manager") return true;
    if (
      capability === "catalog" ||
      capability === "manage" ||
      capability === "collect"
    )
      return false;
    return (
      a.role === "reception" ||
      (a.role === "provider" && a.provider_id === providerId)
    );
  });
}
export function requireAccess(
  actor: Actor,
  capability: Capability,
  locationId: string,
  providerId?: string,
  organizationId = "reserve",
) {
  if (!permitted(actor, capability, locationId, providerId, organizationId))
    throw new BookingError("This workspace access is required.", 403);
}
export async function resolveAccess(
  db: Queryable,
  actor: Actor,
): Promise<Actor> {
  const rows = await db.query<Assignment>(
    "SELECT organization_id,location_id,provider_id,role FROM reserve_access WHERE user_id=$1 AND enabled",
    [actor.id],
  );
  return { ...actor, assignments: rows };
}
export function visitScope(actor: Actor, alias = "a") {
  const scopes = assignments(actor);
  const values: unknown[] = [];
  const terms = scopes.map((a) => {
    const bind = (v: unknown) => {
      values.push(v);
      return `$${values.length}`;
    };
    let term = `${alias}.organization_id=${bind(a.organization_id)}`;
    if (a.role !== "owner")
      term += ` AND ${alias}.location_id=${bind(a.location_id)}`;
    if (a.role === "provider")
      term += ` AND ${alias}.provider_id=${bind(a.provider_id)}`;
    return `(${term})`;
  });
  return { where: terms.length ? `(${terms.join(" OR ")})` : "FALSE", values };
}
