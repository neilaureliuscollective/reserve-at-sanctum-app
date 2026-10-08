// Isolated browser fault injection. Never imported by application code.
if (
  process.env.NODE_ENV === "production" ||
  process.env.DATABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.RESERVE_DEV_PREVIEW !== "true" ||
  process.env.RESERVE_STUDIO_STALL_FIXTURE !== "true"
)
  throw Error("Studio fixture is local development only");
import { PGlite } from "@electric-sql/pglite";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const CommonPGlite = require("@electric-sql/pglite").PGlite;
import { readFileSync } from "node:fs";
for (const PG of new Set([PGlite, CommonPGlite])) {
  const original = PG.prototype.query;
  PG.prototype.query = async function (sql, ...args) {
    let stalled = false;
    try {
      stalled =
        JSON.parse(readFileSync("artifacts/studio-loading-state.json", "utf8"))
          .stall === true;
    } catch {}
    if (stalled && sql.startsWith("SELECT w.*,creator.name"))
      await new Promise(() => {});
    return original.call(this, sql, ...args);
  };
}
