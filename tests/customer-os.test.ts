import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { schema, seed, wrapPglite, type Database } from "../lib/db";
import { customerDestinations, commandWorld } from "../lib/experience/customer-os";
import { listLocations } from "../lib/experience/locations";
import { listMembershipPlans } from "../lib/membership";
import { catalog } from "../lib/booking";
import { sanctumDirectory } from "../lib/experience/sanctum-directory";

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
    [
      "Reserve",
      "Vitalis",
      "Aethelios",
      "Sanctum",
      "Collection",
      "Pathways",
      "Membership",
      "My Reserve",
      "Book",
      "The Chair",
      "Account",
    ],
  );
  const chrome = readFileSync(
    new URL("../components/experience/chrome.tsx", import.meta.url),
    "utf8",
  );
  assert.match(chrome, /customerPrimary/);
  assert.match(chrome, /command-dock/);
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
  assert.ok(
    plans.some((plan) =>
      plan.benefit_model.some((benefit) => benefit.kind === "product_discount"),
    ),
  );
  assert.doesNotMatch(JSON.stringify(plans), /\$\d/);
});

test("internal booking catalog still resolves Katie at Eunice", async () => {
  const services = await catalog(db, "eunice");
  assert.ok(services.some((service) => service.id === "signature"));
});


test("nested journeys retain one stable command world", () => {
  for (const [path, world] of [["/vitalis/journey", "Vitalis"], ["/book", "Sanctum"], ["/fix-it-shop", "Sanctum"], ["/discover/aethelios", "Aethelios"], ["/aethelios", "Aethelios"], ["/pathways", "Reserve"], ["/shop/product", "Collection"]]) assert.equal(commandWorld(path), world);
});

test("Sanctum publishes only available professionals and explicit public service fields", async () => {
  const directory = await sanctumDirectory(db);
  assert.equal(directory.length, 1, "unconfirmed candidate cities stay internal");
  const professional = directory[0].professionals.find(person => person.id === "katie")!;
  assert.ok(professional.services.some(service => service.id === "signature"));
  assert.deepEqual(Object.keys(professional).sort(), ["id", "name", "services"]);
  assert.deepEqual(Object.keys(professional.services[0]).sort(), ["description", "id", "minutes", "name", "price"]);
  try {
    await db.query("UPDATE reserve_providers SET enabled=false WHERE id='katie'");
    assert.equal((await sanctumDirectory(db))[0].professionals.length, 0);
    await db.query("UPDATE reserve_providers SET enabled=true WHERE id='katie'");
    await db.query("UPDATE reserve_locations SET booking_enabled=false WHERE id='eunice'");
    assert.equal((await sanctumDirectory(db))[0].professionals.length, 0, "closed destinations cannot offer services");
  } finally {
    await db.query("UPDATE reserve_providers SET enabled=true WHERE id='katie'");
    await db.query("UPDATE reserve_locations SET booking_enabled=true WHERE id='eunice'");
  }
});

test("Sanctum adds newly published professionals only after location assignment", async () => {
  try {
    await db.query("INSERT INTO reserve_providers(id,name,enabled,location_id) VALUES('directory-test','Synthetic professional',true,'eunice')");
    await db.query("INSERT INTO reserve_services(id,provider_id,name,description,minutes,buffer,price,enabled) VALUES('directory-service','directory-test','Synthetic service','Isolated verification only',30,15,3000,true)");
    assert.ok(!(await sanctumDirectory(db))[0].professionals.some(person => person.id === "directory-test"));
    await db.query("INSERT INTO reserve_provider_locations(provider_id,location_id) VALUES('directory-test','eunice')");
    const person = (await sanctumDirectory(db))[0].professionals.find(person => person.id === "directory-test")!;
    assert.equal(person.services.length, 1);
    assert.equal(person.services[0].id, "directory-service");
    await db.query("UPDATE reserve_services SET enabled=false WHERE id='directory-service'");
    assert.ok(!(await sanctumDirectory(db))[0].professionals.some(person => person.id === "directory-test"));
  } finally {
    await db.query("DELETE FROM reserve_services WHERE id='directory-service'");
    await db.query("DELETE FROM reserve_provider_locations WHERE provider_id='directory-test'");
    await db.query("DELETE FROM reserve_providers WHERE id='directory-test'");
  }
});
