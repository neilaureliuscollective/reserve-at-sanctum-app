import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Actor } from "../../lib/booking";
import { BookingError } from "../../lib/booking";
import type { Database, Queryable, Row } from "../../lib/db";
import { requireAccess } from "../access";
export type Customer = Row & {
  id: string;
  name: string;
  email: string;
  phone: string;
  auth_user_id: string | null;
  organization_id: string;
};
export async function ownCustomer(db: Queryable, actor: Actor) {
  const [row] = await db.query<Customer>(
    `INSERT INTO reserve_customers(id,auth_user_id,name,email,organization_id)
    VALUES($1,$1,$2,$3,$4) ON CONFLICT(auth_user_id) DO UPDATE SET auth_user_id=excluded.auth_user_id RETURNING *`,
    [actor.id, actor.name, actor.email, actor.organization_id || "reserve"],
  );
  return row;
}
const customerSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z.union([z.literal(""), z.email()]).default(""),
    phone: z.string().trim().max(40).default(""),
  })
  .strict();
export async function createCustomer(
  db: Database,
  actor: Actor,
  locationId: string,
  providerId: string,
  raw: unknown,
) {
  requireAccess(actor, "schedule", locationId, providerId);
  const input = customerSchema.parse(raw);
  if (!input.email && !input.phone)
    throw new BookingError("Add an email or phone for this guest.");
  return db.transaction(async (tx) => {
    const [location] = await tx.query<{ organization_id: string }>(
      "SELECT organization_id FROM reserve_locations WHERE id=$1",
      [locationId],
    );
    if (!location) throw new BookingError("Location not found.", 404);
    const [customer] = await tx.query<Customer>(
      "INSERT INTO reserve_customers(id,organization_id,name,email,phone) VALUES($1,$2,$3,$4,$5) RETURNING *",
      [
        randomUUID(),
        location.organization_id,
        input.name,
        input.email,
        input.phone,
      ],
    );
    await tx.query(
      "INSERT INTO reserve_customer_locations(customer_id,location_id) VALUES($1,$2)",
      [customer.id, locationId],
    );
    await tx.query(
      "INSERT INTO reserve_operation_events(actor_id,location_id,entity_id,action) VALUES($1,$2,$3,'customer_created')",
      [actor.id, locationId, customer.id],
    );
    return customer;
  });
}
export async function customers(
  db: Queryable,
  actor: Actor,
  locationId: string,
  providerId: string,
  search = "",
) {
  requireAccess(actor, "schedule", locationId, providerId);
  const providerOnly = !requireManager(actor, locationId);
  return db.query<Customer>(
    `SELECT c.* FROM reserve_customers c JOIN reserve_customer_locations cl ON cl.customer_id=c.id
    WHERE cl.location_id=$1 AND c.name ILIKE $2 AND ($3::boolean=false OR EXISTS(SELECT 1 FROM reserve_appointments a WHERE a.customer_id=c.id AND a.provider_id=$4 AND a.location_id=$1))
    ORDER BY c.name,c.id LIMIT 50`,
    [locationId, `%${search.slice(0, 100)}%`, providerOnly, providerId],
  );
}
function requireManager(actor: Actor, locationId: string) {
  try {
    requireAccess(actor, "manage", locationId);
    return true;
  } catch {
    return false;
  }
}
export async function inviteCustomer(
  db: Database,
  actor: Actor,
  customerId: string,
  locationId: string,
) {
  requireAccess(actor, "manage", locationId);
  const { randomBytes, createHash } = await import("node:crypto");
  return db.transaction(async (tx) => {
    const [customer] = await tx.query<Customer>(
      "SELECT c.* FROM reserve_customers c JOIN reserve_customer_locations cl ON cl.customer_id=c.id WHERE c.id=$1 AND cl.location_id=$2 FOR UPDATE OF c",
      [customerId, locationId],
    );
    if (
      !customer ||
      customer.auth_user_id ||
      !z.email().safeParse(customer.email).success
    )
      throw new BookingError("A guest with an email is required.");
    const token = randomBytes(32).toString("hex");
    await tx.query("DELETE FROM reserve_customer_claims WHERE customer_id=$1", [
      customerId,
    ]);
    await tx.query(
      "INSERT INTO reserve_customer_claims(token_hash,customer_id,email,created_by) VALUES($1,$2,$3,$4)",
      [
        createHash("sha256").update(token).digest("hex"),
        customerId,
        customer.email,
        actor.id,
      ],
    );
    await tx.query(
      "INSERT INTO reserve_operation_events(actor_id,location_id,entity_id,action) VALUES($1,$2,$3,'customer_invited')",
      [actor.id, locationId, customerId],
    );
    return { url: `${process.env.APP_ORIGIN}/account/claim#${token}` };
  });
}
export async function claimCustomer(db: Database, actor: Actor, token: string) {
  const { createHash } = await import("node:crypto");
  if (!/^[a-f0-9]{64}$/.test(token))
    throw new BookingError("Invitation is invalid.");
  return db.transaction(async (tx) => {
    const [user] = await tx.query<{ identity_verified: boolean }>(
      "SELECT identity_verified FROM reserve_users WHERE id=$1",
      [actor.id],
    );
    if (!user?.identity_verified)
      throw new BookingError(
        "Verify your email before accepting the invitation.",
        403,
      );
    const [invite] = await tx.query<{ customer_id: string; email: string }>(
      "SELECT * FROM reserve_customer_claims WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() FOR UPDATE",
      [createHash("sha256").update(token).digest("hex")],
    );
    if (!invite || invite.email.toLowerCase() !== actor.email.toLowerCase())
      throw new BookingError(
        "This invitation is invalid or belongs to another verified email.",
        403,
      );
    const [guest] = await tx.query<Customer>(
      "SELECT * FROM reserve_customers WHERE id=$1 FOR UPDATE",
      [invite.customer_id],
    );
    if (guest.auth_user_id)
      throw new BookingError("This guest account is already linked.", 409);
    const [existing] = await tx.query<Customer>(
      "SELECT * FROM reserve_customers WHERE auth_user_id=$1 FOR UPDATE",
      [actor.id],
    );
    if (existing) {
      await tx.query(
        "UPDATE reserve_orders SET customer_id=$1 WHERE customer_id=$2",
        [guest.id, existing.id],
      );
      await tx.query(
        "UPDATE reserve_appointments SET customer_id=$1 WHERE customer_id=$2",
        [guest.id, existing.id],
      );
      await tx.query(
        "INSERT INTO reserve_customer_locations(customer_id,location_id) SELECT $1,location_id FROM reserve_customer_locations WHERE customer_id=$2 ON CONFLICT DO NOTHING",
        [guest.id, existing.id],
      );
      await tx.query(
        "DELETE FROM reserve_customer_locations WHERE customer_id=$1",
        [existing.id],
      );
      await tx.query("DELETE FROM reserve_customers WHERE id=$1", [
        existing.id,
      ]);
    }
    await tx.query("UPDATE reserve_customers SET auth_user_id=$1 WHERE id=$2", [
      actor.id,
      guest.id,
    ]);
    await tx.query(
      "UPDATE reserve_appointments SET client_id=$1 WHERE customer_id=$2",
      [actor.id, guest.id],
    );
    await tx.query(
      "UPDATE reserve_customer_claims SET used_at=now() WHERE token_hash=$1",
      [createHash("sha256").update(token).digest("hex")],
    );
    await tx.query(
      "INSERT INTO reserve_operation_events(actor_id,entity_id,action) VALUES($1,$2,'customer_claimed')",
      [actor.id, guest.id],
    );
  });
}
