import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { schema, seed, wrapPglite, type Database } from "../lib/db";
import { catalog } from "../lib/booking";
import { listLocations, locations } from "../lib/experience/locations";

let pg: PGlite, db: Database;

before(async () => {
  pg = new PGlite();
  await pg.waitReady;
  db = wrapPglite(pg);
  await schema(db);
  await seed(db);
});
after(async () => pg.close());

test("locations seed Eunice as the operating house", async () => {
  const rows = await listLocations(db);
  assert.equal(rows[0].id, "eunice");
  assert.equal(rows[0].status, "operating");
  assert.ok(!rows.some((row) => row.id === "lafayette" && row.booking_enabled));
  assert.ok(locations.some((row) => row.id === "austin"));
  const [katie] = await db.query<{ location_id: string }>(
    "SELECT location_id FROM reserve_providers WHERE id='katie'",
  );
  assert.equal(katie.location_id, "eunice");
});

test("catalog never offers closed or unassigned locations", async () => {
  const all = await catalog(db);
  const eunice = await catalog(db, "eunice");
  const lafayette = await catalog(db, "lafayette");
  assert.ok(all.length > 0);
  assert.equal(eunice.length, all.length);
  assert.equal(lafayette.length, 0);
});
