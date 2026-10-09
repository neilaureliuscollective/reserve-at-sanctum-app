import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { DateTime } from "luxon";
import { schema, seed, wrapPglite, type Database } from "../lib/db";
import { providerInsights } from "../lib/provider-insights";
import type { Actor } from "../lib/booking";
const staff: Actor = {
  id: "preview-katie",
  name: "Katie",
  email: "katie@preview.invalid",
  role: "operator",
  provider_id: "katie",
};
const now = DateTime.fromISO("2026-11-01T12:00:00", {
  zone: "America/Chicago",
});
let pg: PGlite, db: Database;
async function visit(
  user: string | null,
  crm: string | null,
  days: number,
  status = "completed",
  location: string | null = "eunice",
  provider = "katie",
  exact?: DateTime,
) {
  const start = exact || now.minus({ days }).set({ hour: 10 });
  const id = randomUUID();
  await db.query(
    "INSERT INTO reserve_appointments(id,client_id,crm_client_id,provider_id,service_id,starts_at,ends_at,busy_until,price,status,note,request_key,original_start,location_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,4500,$9,'Private note sentinel',$1,$6,$10)",
    [
      id,
      user,
      crm,
      provider,
      provider === "katie" ? "signature" : "other-service",
      start.toUTC().toISO(),
      start.plus({ minutes: 45 }).toUTC().toISO(),
      start.plus({ minutes: 60 }).toUTC().toISO(),
      status,
      location,
    ],
  );
  return id;
}
before(async () => {
  pg = new PGlite();
  await pg.waitReady;
  db = wrapPglite(pg);
  await schema(db);
  await seed(db);
  await db.query(
    "INSERT INTO reserve_providers(id,name) VALUES('other','Other')",
  );
  await db.query(
    "INSERT INTO reserve_services(id,provider_id,name,description,minutes,price) VALUES('other-service','other','Other service','Other',45,4500)",
  );
  await db.query(
    "INSERT INTO reserve_locations(id,name,short_name,city,timezone) VALUES('lafayette','Z Test House','Test','Test','America/Chicago')",
  );
  await db.query(
    "INSERT INTO reserve_provider_locations(provider_id,location_id) VALUES('katie','lafayette')",
  );
  await db.query(
    "INSERT INTO reserve_clients(id,provider_id,user_id,name,email,phone,source,source_key,created_by) VALUES('linked','katie','preview-client','Jordan linked','private@example.invalid','3375550000','account','linked','preview-katie')",
  );
  await visit("preview-client", null, 80);
  await visit("preview-client", null, 10, "completed", null);
  await visit(null, "linked", 2);
  await visit("preview-other", null, 3);
  await visit("preview-other", null, -10, "confirmed", "lafayette");
  await visit("preview-client", null, 1, "confirmed");
  await visit("preview-client", null, 5, "cancelled");
  await visit("preview-client", null, -5, "cancelled");
  await visit("preview-client", null, -1, "completed");
  await visit("preview-client", null, -2, "confirmed", "eunice", "other");
});
after(async () => pg.close());
test("insights use completed attendance, canonical linked identities and provider-wide future booking coverage, never prices or notes", async () => {
  const d = await providerInsights(db, staff, {}, now);
  assert.equal(d.from, "2026-10-03");
  assert.deepEqual(d.metrics, {
    completed: 3,
    cancelled: 1,
    upcoming: 0,
    minutes: 135,
    clients: 2,
    returning: 1,
    rebooked: 1,
    followUp: 1,
  });
  assert.equal(d.rebookedPercent, 50);
  assert.equal(d.followUp[0].id, "linked");
  assert.equal(d.followUp[0].visits, 2);
  assert.ok(!JSON.stringify(d).includes("Private note sentinel"));
  assert.ok(!JSON.stringify(d).includes("private@example.invalid"));
  assert.ok(!("revenue" in d.metrics));
  assert.equal(
    (await providerInsights(db, staff, { days: 90 }, now)).metrics.completed,
    4,
  );
});
test("insights reject unassigned providers/locations, clients, denied capabilities and malformed filters", async () => {
  await assert.rejects(
    providerInsights(db, { ...staff, role: "client" }, {}, now),
    /Studio access/,
  );
  await assert.rejects(
    providerInsights(db, staff, { provider: "other" }, now),
    /Provider access/,
  );
  await assert.rejects(
    providerInsights(db, staff, { location: "austin" }, now),
    /Location access/,
  );
  for (const capability of ["studio.read", "appointments.read", "clients.read"])
    await assert.rejects(
      providerInsights(
        db,
        {
          ...staff,
          capability_overrides: [
            { capability, decision: "deny", scope: "provider" },
          ],
        },
        {},
        now,
      ),
      /appropriate permission/,
    );
  for (const input of [
    { days: 1 },
    { days: 365 },
    { page: -1 },
    { page: 1.5 },
    { page: 10001 },
  ])
    await assert.rejects(providerInsights(db, staff, input, now));
});
test("cancelled future visits reopen manual follow-up; provider-wide live bookings remove it", async () => {
  const id = await visit("preview-client", null, -4, "confirmed", "lafayette");
  let d = await providerInsights(db, staff, {}, now);
  assert.equal(d.metrics.rebooked, 2);
  assert.equal(d.metrics.followUp, 0);
  await db.query(
    "UPDATE reserve_appointments SET status='cancelled' WHERE id=$1",
    [id],
  );
  d = await providerInsights(db, staff, {}, now);
  assert.equal(d.metrics.rebooked, 1);
  assert.equal(d.metrics.followUp, 1);
});
test("location timezone sets the rolling calendar window including DST; empty data is not 0% retention", async () => {
  await db.query(
    "UPDATE reserve_locations SET timezone='America/Los_Angeles' WHERE id='lafayette'",
  );
  const localNow = DateTime.fromISO("2026-11-01T07:30:00Z");
  const localFrom = localNow
    .setZone("America/Los_Angeles")
    .startOf("day")
    .minus({ days: 29 });
  await visit(
    "preview-other",
    null,
    0,
    "completed",
    "lafayette",
    "katie",
    localFrom,
  );
  await visit(
    "preview-client",
    null,
    0,
    "completed",
    "lafayette",
    "katie",
    localFrom.minus({ minutes: 60 }),
  );
  const d = await providerInsights(
    db,
    staff,
    { location: "lafayette" },
    localNow,
  );
  assert.equal(d.from, localFrom.toISODate());
  assert.equal(d.metrics.completed, 1);
  const empty = await providerInsights(db, staff, {}, now.minus({ years: 5 }));
  assert.equal(empty.metrics.clients, 0);
  assert.equal(empty.rebookedPercent, null);
  assert.deepEqual(empty.followUp, []);
});
test("manual follow-up pagination is stable and totals remain complete beyond 30 rows", async () => {
  for (let i = 0; i < 35; i++) {
    const id = "manual-" + i;
    await db.query(
      "INSERT INTO reserve_clients(id,provider_id,name,source,source_key,created_by) VALUES($1,'katie',$1,'manual',$1,'preview-katie')",
      [id],
    );
    await visit(null, id, 6);
  }
  const first = await providerInsights(db, staff, {}, now),
    second = await providerInsights(db, staff, { page: 1 }, now);
  assert.equal(first.metrics.followUp, 36);
  assert.equal(first.followUp.length, 30);
  assert.equal(first.hasMore, true);
  assert.equal(second.followUp.length, 6);
  assert.equal(second.hasMore, false);
  assert.equal(
    new Set([...first.followUp, ...second.followUp].map((c) => c.id)).size,
    36,
  );
  assert.deepEqual(first.metrics, second.metrics);
});
