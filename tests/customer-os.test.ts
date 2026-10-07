import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { schema, seed, wrapPglite, type Database } from "../lib/db";
import { customerDestinations } from "../lib/experience/customer-os";
import { listLocations } from "../lib/experience/locations";
import { listMembershipPlans } from "../lib/membership";
import { catalog } from "../lib/booking";

let pg: PGlite, db: Database;

before(async () => {
  pg = new PGlite();
  await pg.waitReady;
  db = wrapPglite(pg);
  await schema(db);
  await seed(db);
});
after(async () => pg.close());

test("customer navigation is member navigation separates membership and collection", () => {
  assert.deepEqual(
    customerDestinations.map((item) => item.label),
    ["Home", "Book", "Membership", "My Reserve", "Collection", "The Chair", "Account"],
  );
  const chrome = readFileSync(new URL("../components/experience/chrome.tsx", import.meta.url), "utf8");
  assert.match(chrome, /customerPrimary/);
  assert.match(chrome, /\/shop/);
  assert.match(chrome, /\/my-reserve/);
});

test("locations remain multi-house with Eunice booking-enabled", async () => {
  const rows = await listLocations(db);
  assert.equal(rows[0].id, "eunice");
  assert.equal(rows[0].booking_enabled, true);
  assert.ok(!rows.some((row) => row.id === "lafayette" && row.booking_enabled));
  const [link] = await db.query<{ location_id: string }>(
    "SELECT location_id FROM reserve_provider_locations WHERE provider_id='katie'",
  );
  assert.equal(link.location_id, "eunice");
});

test("membership plans stay inactive and carry a flexible benefit model", async () => {
  const plans = await listMembershipPlans(db);
  assert.ok(plans.every((plan) => plan.active === false));
  assert.ok(plans.every((plan) => plan.benefit_model.length > 0));
  assert.ok(plans.some((plan) => plan.benefit_model.some((benefit) => benefit.kind === "product_discount")));
  assert.doesNotMatch(JSON.stringify(plans), /\$\d/);
});

test("internal booking catalog still resolves Katie at Eunice", async () => {
  const services = await catalog(db, "eunice");
  assert.ok(services.some((service) => service.id === "signature"));
});
