import type { Queryable } from "./db";
/** Hosted-only defense: private Reserve data is accessed through authorized server routes. */
export async function lockdownStudio(db: Queryable) {
  const roles = await db.query<{ rolname: string }>(
    "SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated')",
  );
  const tables = await db.query<{ tablename: string }>(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'reserve\\_%' ESCAPE '\\'",
  );
  for (const { rolname } of roles)
    for (const { tablename } of tables) {
      if (!/^reserve_[a-z_]+$/.test(tablename))
        throw Error("Unexpected Reserve table identifier.");
      await db.query(
        `REVOKE ALL PRIVILEGES ON TABLE public."${tablename}" FROM "${rolname}"`,
      );
    }
}
