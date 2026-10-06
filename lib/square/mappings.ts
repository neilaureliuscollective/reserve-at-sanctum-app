import type { Queryable } from "../db";
import { squareEnvironment } from "./config";
import type { MappingKind, SquareMapping } from "./types";

export async function mapUserToSquareCustomer(
  db: Queryable,
  userId: string,
  squareCustomerId: string,
  environment = squareEnvironment(),
) {
  await db.query(
    `INSERT INTO square_customer_mappings(user_id,square_customer_id,square_environment,synced_at)
     VALUES($1,$2,$3,now())
     ON CONFLICT (user_id) DO UPDATE SET square_customer_id=EXCLUDED.square_customer_id, square_environment=EXCLUDED.square_environment, synced_at=now()`,
    [userId, squareCustomerId, environment],
  );
}

export async function squareCustomerForUser(db: Queryable, userId: string) {
  const [row] = await db.query<{ square_customer_id: string; square_environment: string }>(
    "SELECT square_customer_id, square_environment FROM square_customer_mappings WHERE user_id=$1",
    [userId],
  );
  return row ?? null;
}

export async function mapLocationToSquare(
  db: Queryable,
  locationId: string,
  squareLocationId: string,
  environment = squareEnvironment(),
) {
  await db.query(
    `INSERT INTO square_location_mappings(location_id,square_location_id,square_environment)
     VALUES($1,$2,$3)
     ON CONFLICT (location_id) DO UPDATE SET square_location_id=EXCLUDED.square_location_id, square_environment=EXCLUDED.square_environment`,
    [locationId, squareLocationId, environment],
  );
}

export async function squareLocationFor(db: Queryable, locationId: string) {
  const [row] = await db.query<{ square_location_id: string; square_environment: string }>(
    "SELECT square_location_id, square_environment FROM square_location_mappings WHERE location_id=$1",
    [locationId],
  );
  return row ?? null;
}

export async function mapProviderToSquareTeam(
  db: Queryable,
  providerId: string,
  squareTeamMemberId: string,
  environment = squareEnvironment(),
) {
  await db.query(
    `INSERT INTO square_provider_mappings(provider_id,square_team_member_id,square_environment)
     VALUES($1,$2,$3)
     ON CONFLICT (provider_id) DO UPDATE SET square_team_member_id=EXCLUDED.square_team_member_id, square_environment=EXCLUDED.square_environment`,
    [providerId, squareTeamMemberId, environment],
  );
}

export async function squareTeamMemberFor(db: Queryable, providerId: string) {
  const [row] = await db.query<{ square_team_member_id: string; square_environment: string }>(
    "SELECT square_team_member_id, square_environment FROM square_provider_mappings WHERE provider_id=$1",
    [providerId],
  );
  return row ?? null;
}

export async function mapCatalogObject(
  db: Queryable,
  mapping: SquareMapping & { internalKind: MappingKind },
) {
  await db.query(
    `INSERT INTO square_catalog_mappings(internal_id,internal_kind,square_catalog_object_id,square_variation_id,square_environment)
     VALUES($1,$2,$3,$4,$5)
     ON CONFLICT (internal_kind,internal_id,square_environment) DO UPDATE
     SET square_catalog_object_id=EXCLUDED.square_catalog_object_id, square_variation_id=EXCLUDED.square_variation_id`,
    [
      mapping.internalId,
      mapping.internalKind,
      mapping.squareId,
      mapping.squareSecondaryId ?? null,
      mapping.environment,
    ],
  );
}

export async function squareCatalogFor(
  db: Queryable,
  kind: MappingKind,
  internalId: string,
  environment = squareEnvironment(),
) {
  const [row] = await db.query<{
    square_catalog_object_id: string;
    square_variation_id: string | null;
  }>(
    `SELECT square_catalog_object_id, square_variation_id
     FROM square_catalog_mappings
     WHERE internal_kind=$1 AND internal_id=$2 AND square_environment=$3`,
    [kind, internalId, environment],
  );
  return row ?? null;
}

export async function mapMembershipToSquareSubscription(
  db: Queryable,
  membershipId: string,
  squareSubscriptionId: string,
  squarePlanVariationId?: string | null,
  environment = squareEnvironment(),
) {
  await db.query(
    `INSERT INTO square_subscription_mappings(membership_id,square_subscription_id,square_plan_variation_id,square_environment)
     VALUES($1,$2,$3,$4)
     ON CONFLICT (membership_id) DO UPDATE
     SET square_subscription_id=EXCLUDED.square_subscription_id,
         square_plan_variation_id=EXCLUDED.square_plan_variation_id,
         square_environment=EXCLUDED.square_environment`,
    [membershipId, squareSubscriptionId, squarePlanVariationId ?? null, environment],
  );
}

export async function squareSubscriptionFor(db: Queryable, membershipId: string) {
  const [row] = await db.query<{
    square_subscription_id: string;
    square_plan_variation_id: string | null;
    square_environment: string;
  }>(
    "SELECT square_subscription_id, square_plan_variation_id, square_environment FROM square_subscription_mappings WHERE membership_id=$1",
    [membershipId],
  );
  return row ?? null;
}
