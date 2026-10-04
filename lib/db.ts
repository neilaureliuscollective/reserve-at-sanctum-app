import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
import { readFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { serverlessDatabaseUrl } from "./db-connection";
export type Row = Record<string, unknown>;
export interface Queryable {
  query<T extends Row = Row>(sql: string, params?: unknown[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
}
export interface Database extends Queryable {
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
}
export const isPreview = () =>
  process.env.NODE_ENV !== "production" &&
  process.env.RESERVE_DEV_PREVIEW === "true";
export const configured = () =>
  Boolean(
    isPreview() ||
      (process.env.DATABASE_URL &&
        (process.env.VERCEL_ENV !== "preview" ||
          process.env.RESERVE_DATABASE_ENV === "preview")),
  );

const globalDb = globalThis as unknown as { reserveDb?: Promise<Database> };
export function wrapPglite(pg: PGlite): Database {
  const wrap = (conn: Pick<PGlite, "query" | "exec">): Queryable => ({
    exec: async (s) => {
      await conn.exec(s);
    },
    query: async <T extends Row>(s: string, p: unknown[] = []) =>
      (await conn.query<T>(s, p)).rows,
  });
  return {
    ...wrap(pg),
    transaction: (fn) =>
      pg.transaction((tx) => fn(wrap(tx as unknown as PGlite))),
  };
}
export async function schema(db: Database) {
  const directory = path.join(process.cwd(), "migrations");
  await db.transaction(async (tx) => {
    await tx.query("SELECT pg_advisory_xact_lock(817504001)");
    await tx.exec(
      "CREATE TABLE IF NOT EXISTS reserve_migrations(name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now()); ALTER TABLE reserve_migrations ENABLE ROW LEVEL SECURITY;",
    );
    for (const file of (await readdir(directory))
      .filter((name) => /^\d+.*\.sql$/.test(name))
      .sort()) {
      const source = await readFile(path.join(directory, file), "utf8");
      const checksum = createHash("sha256").update(source).digest("hex");
      const [applied] = await tx.query<{ checksum: string }>(
        "SELECT checksum FROM reserve_migrations WHERE name=$1",
        [file],
      );
      if (applied && applied.checksum !== checksum)
        throw new Error(`Applied migration changed: ${file}`);
      if (applied) continue;
      await tx.exec(source);
      await tx.query(
        "INSERT INTO reserve_migrations(name,checksum) VALUES($1,$2)",
        [file, checksum],
      );
    }
  });
}
export async function seed(db: Queryable) {
  await db.query(`INSERT INTO reserve_users(id,name,email,role,provider_id) VALUES
 ('preview-neil','Neil · owner preview','neil@preview.invalid','owner',NULL),
 ('preview-katie','Katie · studio preview','katie@preview.invalid','staff','katie'),
 ('preview-client','Jordan · client preview','jordan@preview.invalid','client',NULL),
 ('preview-other','Morgan · client preview','morgan@preview.invalid','client',NULL) ON CONFLICT DO NOTHING`);
  await db.query(
    `INSERT INTO reserve_providers(id,name,enabled) VALUES('katie','Katie',true) ON CONFLICT DO NOTHING`,
  );
  await db.query(
    "UPDATE reserve_locations SET status='pilot',booking_enabled=true WHERE id='eunice'",
  );
  await db.query(
    "INSERT INTO reserve_provider_locations(provider_id,location_id,bookable) VALUES('katie','eunice',true) ON CONFLICT(provider_id,location_id) DO NOTHING",
  );
  await db.query(
    "INSERT INTO reserve_provider_brands(provider_id,name,slug) VALUES('katie','Fix It Shop','fix-it-shop') ON CONFLICT DO NOTHING",
  );
  await db.query(
    "INSERT INTO reserve_customers(id,auth_user_id,name,email) SELECT id,id,name,email FROM reserve_users ON CONFLICT DO NOTHING",
  );
  await db.query(
    "INSERT INTO reserve_access(id,user_id,organization_id,location_id,provider_id,role) VALUES('preview-owner','preview-neil','reserve',NULL,NULL,'owner'),('preview-provider','preview-katie','reserve','eunice','katie','provider'),('preview-manager','preview-katie','reserve','eunice',NULL,'manager') ON CONFLICT DO NOTHING",
  );
  await db.query(
    "INSERT INTO reserve_hours(id,location_id,provider_id,weekday,start_minute,end_minute) SELECT 'seed:'||scope||':'||d,'eunice',CASE WHEN scope='provider' THEN 'katie' ELSE NULL END,d,540,1020 FROM unnest(ARRAY['location','provider']) scope CROSS JOIN unnest(ARRAY[2,3,4,5,6]) d ON CONFLICT DO NOTHING",
  );
  await db.query(`INSERT INTO reserve_services(id,provider_id,name,description,minutes,buffer,price,enabled) VALUES
 ('signature','katie','Signature grooming','A considered cut, finish, and time to find your style.',45,15,4500,true),
 ('refresh','katie','The refresh','A focused maintenance visit to keep your look in order.',30,15,3000,true),
 ('consultation','katie','Cut & consultation','A little more time to shape what comes next.',60,15,6000,true) ON CONFLICT DO NOTHING`);
}
export async function database(): Promise<Database> {
  if (!globalDb.reserveDb)
    globalDb.reserveDb = (async () => {
      if (process.env.DATABASE_URL) {
        if (!configured())
          throw new Error(
            "An isolated preview database must be explicitly configured.",
          );
        const sql = postgres(serverlessDatabaseUrl(process.env.DATABASE_URL), {
          prepare: false,
          max: 3,
        });
        const wrap = (q: typeof sql): Queryable => ({
          exec: async (s) => {
            await q.unsafe(s);
          },
          query: async <T extends Row>(s: string, p: unknown[] = []) =>
            Array.from(await q.unsafe(s, p as never[])) as T[],
        });
        return {
          ...wrap(sql),
          transaction: <T>(fn: (tx: Queryable) => Promise<T>) =>
            sql.begin((tx) =>
              fn(wrap(tx as unknown as typeof sql)),
            ) as Promise<T>,
        };
      }
      if (!isPreview()) throw new Error("Hosted database setup is required.");
      await mkdir(".data", { recursive: true });
      const pg = new PGlite(
        path.resolve(process.env.RESERVE_PREVIEW_PATH || ".data/reserve"),
      );
      await pg.waitReady;
      const db = wrapPglite(pg);
      await schema(db);
      await seed(db);
      return db;
    })().catch((e) => {
      globalDb.reserveDb = undefined;
      throw e;
    });
  return globalDb.reserveDb;
}
