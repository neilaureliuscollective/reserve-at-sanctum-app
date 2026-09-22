import { PGlite } from "@electric-sql/pglite";
import path from "node:path";
import { existsSync } from "node:fs";

if (process.env.NODE_ENV === "production" || process.env.DATABASE_URL) {
  throw new Error(
    "Reset is restricted to the isolated local synthetic preview.",
  );
}
const location = path.resolve(".data/reserve");
if (!existsSync(location)) {
  console.log("No local preview database exists. Nothing to reset.");
} else {
  const pg = new PGlite(location);
  try {
    await pg.exec(`BEGIN;
      DELETE FROM reserve_occupancy;
      DELETE FROM reserve_audit;
      DELETE FROM reserve_appointments;
      DELETE FROM reserve_sessions;
      COMMIT;`);
    console.log(
      "Local synthetic appointments and sessions cleared. Catalog and profiles preserved.",
    );
  } finally {
    await pg.close();
  }
}
