import { Pool, type PoolClient } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import type { Database, Queryable, Row } from "./db";

/** Supavisor uses transaction pooling. Keep each transaction on its checked-out
 * connection and destroy failed clients; never retry a possibly committed write.
 * Vercel's lifecycle hook drains idle clients before an instance is suspended. */
export function hostedDatabase(connectionString: string): Database {
  const pool = new Pool({
    connectionString,
    max: 3,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 5000,
    maxLifetimeSeconds: 60,
    query_timeout: 12000,
    application_name: "legacy-reserve",
  });
  attachDatabasePool(pool);
  // Idle socket errors must not crash the entire serverless instance.
  pool.on("error", () => console.error("Reserve idle database connection failed"));
  const wrap = (client: PoolClient): Queryable => ({
    query: async <T extends Row>(text: string, values: unknown[] = []) =>
      (await client.query<T>(text, values)).rows,
  });
  return {
    query: async <T extends Row>(text: string, values: unknown[] = []) => {
      const client = await pool.connect();
      let failed = false;
      try {
        return await wrap(client).query<T>(text, values);
      } catch (error) {
        failed = true;
        throw error;
      } finally {
        client.release(failed);
      }
    },
    transaction: async <T>(fn: (tx: Queryable) => Promise<T>) => {
      const client = await pool.connect();
      let failed = false;
      try {
        await client.query("BEGIN");
        await client.query("SET LOCAL statement_timeout = '10s'");
        await client.query("SET LOCAL idle_in_transaction_session_timeout = '15s'");
        const result = await fn(wrap(client));
        await client.query("COMMIT");
        return result;
      } catch (error) {
        failed = true;
        try { await client.query("ROLLBACK"); } catch { /* Destroy below. */ }
        throw error;
      } finally {
        client.release(failed);
      }
    },
  };
}
