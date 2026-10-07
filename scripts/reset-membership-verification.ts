import { PGlite } from "@electric-sql/pglite";
import path from "node:path";
import { schema, seed, wrapPglite } from "../lib/db";
if (process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)
  throw Error("Synthetic local reset only.");
async function main() {
  const pg = new PGlite(path.resolve(".data/reserve"));
  await pg.waitReady;
  try {
    const db = wrapPglite(pg);
    await schema(db);
    await seed(db);
    await db.query(
      "DELETE FROM reserve_membership_events WHERE actor_id IN ('preview-neil','preview-client','preview-katie','preview-other')",
    );
    await db.query(
      "DELETE FROM reserve_membership_requests WHERE user_id IN ('preview-client','preview-other')",
    );
    await db.query(
      "DELETE FROM reserve_memberships WHERE user_id IN ('preview-client','preview-other')",
    );
    await db.query(
      "UPDATE reserve_membership_plans SET active=false WHERE id IN ('house','circle','private')",
    );
  } finally {
    await pg.close();
  }
}
void main();
