import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { DateTime } from "luxon";
import { schema, seed, wrapPglite, type Database } from "../lib/db";
import { book, visits, type Actor } from "../lib/booking";
import { providerDay } from "../lib/provider-day";
import { blockTime } from "../lib/studio-blocks";
const staff: Actor = {
  id: "preview-katie",
  name: "Katie",
  email: "katie@preview.invalid",
  role: "operator",
  provider_id: "katie",
};
const client: Actor = {
  id: "preview-client",
  name: "Jordan",
  email: "client@preview.invalid",
  role: "client",
  provider_id: null,
};
let pg: PGlite, db: Database, appointment: string;
let day = DateTime.now()
  .setZone("America/Chicago")
  .startOf("day")
  .plus({ days: 20 });
while (![2, 3, 4, 5, 6].includes(day.weekday)) day = day.plus({ days: 1 });
before(async () => {
  pg = new PGlite();
  await pg.waitReady;
  db = wrapPglite(pg);
  await schema(db);
  await seed(db);
  const a = await book(db, client, {
    serviceId: "signature",
    start: day.set({ hour: 10 }).toUTC().toISO()!,
    note: "Do not project private note",
    requestKey: randomUUID(),
  });
  appointment = a.id;
  await db.query(
    "UPDATE reserve_appointments SET location_id=NULL WHERE id=$1",
    [a.id],
  );
  await blockTime(db, staff, {
    provider: "katie",
    date: day.toISODate()!,
    start: "12:00",
    end: "13:00",
  });
});
after(async () => {
  await pg.close();
});
test("provider day and primary-house calendar preserve legacy visits; openings respect occupancy and blocks", async () => {
  const data = await providerDay(db, staff, {
    date: day.toISODate()!,
    location: "eunice",
    service: "signature",
  });
  assert.equal(data.counts.confirmed, 1);
  assert.equal(data.visits[0].id, appointment);
  assert.equal(
    data.visits[0].clientHref,
    `/studio/clients/${data.visits[0].crm_client_id || "preview-client"}`,
  );
  assert.ok(!("note" in data.visits[0]));
  assert.equal(data.slotState, "ready");
  assert.ok(data.slots.length);
  assert.ok(
    !data.slots.some((s) => s.start === day.set({ hour: 10 }).toUTC().toISO()),
  );
  assert.ok(
    !data.slots.some(
      (s) => DateTime.fromISO(s.start).setZone("America/Chicago").hour === 12,
    ),
  );
  assert.equal(
    (
      await visits(db, staff, true, 0, day.toISODate()!, 1, "katie", "eunice")
    )[0].id,
    appointment,
  );
});
test("provider day rejects client, other-provider, foreign-location, malformed day and denied Studio access", async () => {
  await assert.rejects(
    providerDay(db, client, { provider: "katie" }),
    /Studio access/,
  );
  await assert.rejects(
    providerDay(db, { ...staff, provider_id: "other" }, { provider: "katie" }),
    /Provider access/,
  );
  await assert.rejects(
    providerDay(db, staff, { location: "unknown" }),
    /Location access/,
  );
  await assert.rejects(
    providerDay(db, staff, { date: "2026-02-30" }),
    /valid day/,
  );
  await assert.rejects(
    providerDay(db, {
      ...staff,
      capability_overrides: [
        { capability: "studio.read", decision: "deny", scope: "assigned" },
      ],
    }),
    /Studio access/,
  );
});
test("client-history links honor client read overrides while appointments remain visible", async () => {
  const data = await providerDay(
    db,
    {
      ...staff,
      capability_overrides: [
        { capability: "clients.read", decision: "deny", scope: "provider" },
      ],
    },
    { date: day.toISODate()! },
  );
  assert.equal(data.visits[0].clientHref, null);
  assert.equal(data.counts.confirmed, 1);
});
test("closed booking keeps existing calendar appointments and reports closed availability", async () => {
  await db.query(
    "UPDATE reserve_locations SET booking_enabled=false WHERE id='eunice'",
  );
  const data = await providerDay(db, staff, {
    date: day.toISODate()!,
    service: "signature",
  });
  assert.equal(data.counts.confirmed, 1);
  assert.equal(data.slotState, "closed");
  assert.deepEqual(data.slots, []);
  await db.query(
    "UPDATE reserve_locations SET booking_enabled=true WHERE id='eunice'",
  );
});
test("provider day uses assigned location timezone for its midnight boundaries", async () => {
  await db.query(
    "INSERT INTO reserve_locations(id,name,short_name,city,region,timezone,address,enabled,booking_enabled) VALUES('la','West studio','West','Los Angeles','CA','America/Los_Angeles','',true,true)",
  );
  await db.query(
    "INSERT INTO reserve_provider_locations(provider_id,location_id) VALUES('katie','la')",
  );
  const stamp = day
    .setZone("America/Los_Angeles", { keepLocalTime: true })
    .set({ hour: 23, minute: 30 })
    .toUTC()
    .toISO()!;
  await db.query(
    "UPDATE reserve_appointments SET location_id='la',starts_at=$1,ends_at=$2,busy_until=$2 WHERE id=$3",
    [stamp, DateTime.fromISO(stamp).plus({ minutes: 45 }).toISO(), appointment],
  );
  const data = await providerDay(db, staff, {
    date: day.toISODate()!,
    location: "la",
  });
  assert.equal(data.location?.timezone, "America/Los_Angeles");
  assert.equal(data.visits[0].id, appointment);
  assert.equal(
    (
      await providerDay(db, staff, {
        date: day.plus({ days: 1 }).toISODate()!,
        location: "la",
      })
    ).visits.length,
    0,
  );
});
