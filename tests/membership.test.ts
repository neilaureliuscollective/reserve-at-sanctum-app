import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { schema, seed, wrapPglite, type Database } from "../lib/db";
import { listMembershipPlans, membershipDesk, readMembership } from "../lib/membership";
import type { Actor } from "../lib/booking";

let pg: PGlite, db: Database;
const client: Actor = {
  id: "preview-client",
  name: "Jordan",
  email: "jordan@preview.invalid",
  role: "client",
  provider_id: null,
};

before(async () => {
  pg = new PGlite();
  await pg.waitReady;
  db = wrapPglite(pg);
  await schema(db);
  await seed(db);
});
after(async () => pg.close());

test("membership plans exist as inactive foundations", async () => {
  const plans = await listMembershipPlans(db);
  assert.deepEqual(plans.map((plan) => plan.id), ["house", "circle", "private"]);
  assert.ok(plans.every((plan) => plan.active === false));
  assert.ok(plans.every((plan) => plan.benefits.length > 0));
});

test("clients have no invented membership until one is provisioned", async () => {
  const desk = await membershipDesk(db, client);
  assert.equal(desk.membership, null);
  assert.equal(desk.offered, false);
  assert.equal(await readMembership(db, client), null);
});
