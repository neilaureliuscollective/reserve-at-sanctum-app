import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
export type Row = Record<string, unknown>;
export interface Queryable {
  query<T extends Row = Row>(sql: string, params?: unknown[]): Promise<T[]>;
}
export interface Database extends Queryable {
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
}
export const isPreview = () =>
  process.env.NODE_ENV !== "production" &&
  process.env.RESERVE_DEV_PREVIEW === "true";
export const configured = () =>
  Boolean(process.env.DATABASE_URL || isPreview());
const globalDb = globalThis as unknown as { reserveDb?: Promise<Database> };
export function wrapPglite(pg: PGlite): Database {
  const wrap = (conn: Pick<PGlite, "query">): Queryable => ({
    query: async <T extends Row>(s: string, p: unknown[] = []) =>
      (await conn.query<T>(s, p)).rows,
  });
  return {
    ...wrap(pg),
    transaction: (fn) =>
      pg.transaction((tx) => fn(wrap(tx as unknown as PGlite))),
  };
}
export async function schema(db: Queryable) {
  const source = await readFile(
    path.join(process.cwd(), "migrations/001_core.sql"),
    "utf8",
  );
  for (const statement of source
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean))
    await db.query(statement);
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
  await db.query(`INSERT INTO reserve_services(id,provider_id,name,description,minutes,buffer,price,enabled) VALUES
 ('signature','katie','Signature grooming','A considered cut, finish, and time to find your style.',45,15,4500,true),
 ('refresh','katie','The refresh','A focused maintenance visit to keep your look in order.',30,15,3000,true),
 ('consultation','katie','Cut & consultation','A little more time to shape what comes next.',60,15,6000,true) ON CONFLICT DO NOTHING`);
}
export async function database(): Promise<Database> {
  if (!globalDb.reserveDb)
    globalDb.reserveDb = (async () => {
      if (process.env.DATABASE_URL) {
        const sql = postgres(process.env.DATABASE_URL, {
          prepare: false,
          max: 3,
        });
        const wrap = (q: typeof sql): Queryable => ({
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
      const pg = new PGlite(path.resolve(".data/reserve"));
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
