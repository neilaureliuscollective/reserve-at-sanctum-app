import { Pool } from "pg";
import { migrationManifest, applyReviewedMigrations } from "../lib/booking-migrations";
import type { Database, Queryable, Row } from "../lib/db";
async function main() {
  const manifest = await migrationManifest();
  if (!process.argv.includes("--apply-reviewed-migrations")) {
    console.log(JSON.stringify({ mode: "plan-only", migrations: manifest }, null, 2));
    console.log("No database was contacted. Reconcile hosted history and restore backup before founder-approved application.");
    return;
  }
  // Migration authority is separate from the serverless runtime connection.
  const value = process.env.RESERVE_MIGRATION_DATABASE_URL;
  if (!value) throw Error("Configure the intended admin migration connection securely.");
  const target = new URL(value);
  if (!["postgres:", "postgresql:"].includes(target.protocol) || target.port === "6543")
    throw Error("Use a direct or session-mode Postgres connection for migrations.");
  if (!process.argv.includes(`--target-host=${target.hostname}`))
    throw Error("Explicit reviewed target host is required.");
  const pool = new Pool({ connectionString: value, max: 1, connectionTimeoutMillis: 5000 });
  const wrap = (client: import("pg").PoolClient): Queryable => ({ query: async <T extends Row>(sql: string, params: unknown[] = []) => (await client.query<T>(sql,params)).rows });
  const db: Database = {
    query: async () => { throw Error("Migrations must stay in one transaction."); },
    transaction: async fn => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SET LOCAL statement_timeout='120s'");
        await client.query("SET LOCAL lock_timeout='5s'");
        const result = await fn(wrap(client));
        await client.query("COMMIT");
        return result;
      } catch (e) { try { await client.query("ROLLBACK"); } catch { /* Release below. */ } throw e; }
      finally { client.release(true); }
    },
  };
  try {
    await applyReviewedMigrations(db);
    console.log("Reviewed migrations committed; browser grants revoked. No staff or live offerings were provisioned.");
  } finally { await pool.end(); }
}
main().catch(() => {
  console.error("Migration unavailable. Check reviewed target, connection, schema baseline and permissions. No credentials or SQL errors are printed.");
  process.exitCode = 1;
});
