import type { Queryable } from "./db";
import { BookingError } from "./booking-error";

// Read-only catalog checks do not catch SQL errors or cache authorization. Missing
// additive schema is expected during code-first rollout; connection/permission
// failures still propagate. This is a shape check, not commissioning acceptance.
const prerequisites = {
  business: {
    reserve_businesses: ["id", "slug", "state"],
    reserve_business_memberships: ["business_id", "user_id", "role", "verified_at", "revoked_at", "revision"],
    reserve_business_providers: ["business_id", "provider_id"],
    reserve_business_locations: ["business_id", "location_id"],
    reserve_business_provider_locations: ["business_id", "provider_id", "location_id"],
    reserve_business_staff_assignments: ["business_id", "user_id", "provider_id"],
    reserve_business_events: ["business_id", "actor_id", "action"],
  },
  authDelivery: { reserve_auth_delivery_limits: ["key_hash", "window_start", "attempts"] },
} as const;
export async function featureSchemaReady(db: Queryable, feature: keyof typeof prerequisites) {
  const required = Object.entries(prerequisites[feature]).flatMap(([table, columns]) =>
    columns.map((column: string) => `${table}.${column}`));
  const [result] = await db.query<{ ready: boolean }>(`
    SELECT NOT EXISTS (
      SELECT 1 FROM unnest($1::text[]) AS required(name)
      WHERE NOT EXISTS (SELECT 1 FROM pg_attribute a
        WHERE a.attrelid=to_regclass(split_part(required.name,'.',1))
        AND a.attname=split_part(required.name,'.',2)
        AND a.attnum>0 AND NOT a.attisdropped)
    ) AS ready`, [required]);
  return result.ready;
}
export async function requireFeatureSchema(db: Queryable, feature: keyof typeof prerequisites) {
  if (!await featureSchemaReady(db, feature))
    throw new BookingError(feature === "business"
      ? "Business management is not ready. Required schema must be reviewed before access can open."
      : "Account creation and confirmation are not ready. Please try again later; existing accounts can still sign in.", 503);
}
