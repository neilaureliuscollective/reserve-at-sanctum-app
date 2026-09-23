import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { DateTime } from "luxon";
import { wrapPglite, schema, seed, isPreview, type Database } from "../lib/db";
import { book, change, visits, availability, catalog, type Actor } from "../lib/booking";
let pg: PGlite, db: Database;
const client: Actor = {
  id: "preview-client",
  name: "Jordan",
  email: "jordan@preview.invalid",
  role: "client",
  organization_id: "reserve-at-sanctum",
  provider_id: null,
};
const other: Actor = {
  id: "preview-other",
  name: "Morgan",
  email: "morgan@preview.invalid",
  role: "client",
  organization_id: "reserve-at-sanctum",
  provider_id: null,
};
const staff: Actor = {
  id: "preview-katie",
  name: "Katie",
  email: "katie@preview.invalid",
  role: "staff",
  organization_id: "reserve-at-sanctum",
  provider_id: "katie",
};
let offset = 1;
function time(hour = 10) {
  let d = DateTime.now()
    .setZone("America/Chicago")
    .startOf("day")
    .plus({ days: offset++ });
  while (![2, 3, 4, 5, 6].includes(d.weekday)) d = d.plus({ days: 1 });
  offset =
    Math.ceil(
      d.diff(DateTime.now().setZone("America/Chicago").startOf("day"), "days")
        .days,
    ) + 1;
  return d.set({ hour }).toUTC().toISO()!;
}
const input = (start: string) => ({
  serviceId: "signature",
  start,
  note: "A natural finish.",
  requestKey: randomUUID(),
});
before(async () => {
  pg = new PGlite();
  await pg.waitReady;
  db = wrapPglite(pg);
  await schema(db);
  await seed(db);
});
after(async () => {
  await pg.close();
});
test("booking persists in the client and authorized studio views, with server-owned price", async () => {
  const a = await book(db, client, input(time()));
  assert.equal(a.price, 4500);
  assert.ok((await visits(db, client)).some((x) => x.id === a.id));
  assert.ok((await visits(db, staff, true)).some((x) => x.id === a.id));
  assert.ok(!(await visits(db, other)).some((x) => x.id === a.id));
});
test("simultaneous requests for an occupied slot produce exactly one reservation", async () => {
  const t = time();
  const results = await Promise.allSettled([
    book(db, client, input(t)),
    book(db, other, input(t)),
  ]);
  assert.equal(results.filter((x) => x.status === "fulfilled").length, 1);
  assert.equal(results.filter((x) => x.status === "rejected").length, 1);
  const rows = await db.query(
    "SELECT * FROM reserve_appointments WHERE starts_at=$1",
    [t],
  );
  assert.equal(rows.length, 1);
});
test("idempotent retries return the same appointment and reject changed payloads", async () => {
  const i = input(time());
  const a = await book(db, client, i),
    b = await book(db, client, i);
  assert.equal(a.id, b.id);
  await assert.rejects(
    book(db, client, { ...i, note: "changed" }),
    /already used/,
  );
});
test("reschedule preserves the appointment ID and price; cancellation releases occupancy", async () => {
  const a = await book(db, client, input(time()));
  const t = time();
  const b = await change(db, client, a.id, {
    action: "reschedule",
    start: t,
    revision: 1,
  });
  assert.equal(b.id, a.id);
  assert.equal(b.price, a.price);
  assert.equal(b.revision, 2);
  assert.equal(new Date(b.starts_at).toISOString(), t);
  const c = await change(db, client, a.id, { action: "cancel", revision: 2 });
  assert.equal(c.status, "cancelled");
  assert.equal(
    (
      await db.query(
        "SELECT * FROM reserve_occupancy WHERE appointment_id=$1",
        [a.id],
      )
    ).length,
    0,
  );
});
test("failed rescheduling rolls back to the original time and occupancy", async () => {
  const t1 = time(),
    t2 = time();
  const a = await book(db, client, input(t1));
  await book(db, other, input(t2));
  await assert.rejects(
    change(db, client, a.id, { action: "reschedule", start: t2, revision: 1 }),
    /just taken/,
  );
  const [stored] = await db.query<{ starts_at: Date }>(
    "SELECT starts_at FROM reserve_appointments WHERE id=$1",
    [a.id],
  );
  assert.equal(new Date(stored.starts_at).toISOString(), t1);
  assert.equal(
    (
      await db.query(
        "SELECT * FROM reserve_occupancy WHERE appointment_id=$1",
        [a.id],
      )
    ).length,
    4,
  );
});
test("cross-client changes, unauthorized studio access, and stale revisions fail", async () => {
  const a = await book(db, client, input(time()));
  await assert.rejects(
    change(db, other, a.id, { action: "cancel", revision: 1 }),
    /not found/,
  );
  await assert.rejects(visits(db, client, true), /Studio access/);
  await assert.rejects(
    change(db, staff, a.id, { action: "cancel", revision: 9 }),
    /Refresh/,
  );
  await assert.rejects(
    change(db, { ...staff, provider_id: "unassigned" }, a.id, {
      action: "cancel",
      revision: 1,
    }),
    /not found/,
  );
});
test("buffers and staff blocks remove availability at the database boundary", async () => {
  const t = time();
  await book(db, client, input(t));
  const overlap = DateTime.fromISO(t).plus({ minutes: 45 }).toISO()!;
  await assert.rejects(book(db, other, input(overlap)), /just taken/);
  const blocked = DateTime.fromISO(t).plus({ hours: 2 }).toISO()!;
  await db.query(
    "INSERT INTO reserve_occupancy(provider_id,starts_at,block_reason) VALUES($1,$2,$3)",
    ["katie", blocked, "Time off"],
  );
  await assert.rejects(book(db, other, input(blocked)), /just taken/);
  const date = DateTime.fromISO(t).setZone("America/Chicago").toISODate()!;
  assert.ok(
    !(await availability(db, "signature", date)).some((x) => x.start === t),
  );
});
test("past and closed-hour reservations are rejected", async () => {
  await assert.rejects(
    book(
      db,
      client,
      input(DateTime.now().minus({ days: 1 }).toUTC().startOf("hour").toISO()!),
    ),
    /two hours/,
  );
  await assert.rejects(book(db, client, input(time(20))), /outside studio/);
});
test("production never accepts the development preview flag", () => {
  const env: Record<string, string | undefined> = process.env;
  const prior = env.NODE_ENV,
    flag = env.RESERVE_DEV_PREVIEW;
  try {
    env.NODE_ENV = "production";
    env.RESERVE_DEV_PREVIEW = "true";
    assert.equal(isPreview(), false);
  } finally {
    if (prior === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = prior;
    if (flag === undefined) delete env.RESERVE_DEV_PREVIEW;
    else env.RESERVE_DEV_PREVIEW = flag;
  }
});
test("a second organization's records remain outside the Reserve and cross-organization references fail", async () => {
  await db.query("INSERT INTO reserve_organizations(id,name,brand_key) VALUES('another-shop','Another shop','other')");
  await db.query("INSERT INTO reserve_locations(id,organization_id,name,time_zone) VALUES('another-location','another-shop','Another location','America/Chicago')");
  await db.query("INSERT INTO reserve_providers(id,organization_id,location_id,name,enabled) VALUES('other-provider','another-shop','another-location','Other provider',true)");
  await db.query("INSERT INTO reserve_users(id,name,email,organization_id) VALUES('other-client','Other client','other@another.invalid','another-shop')");
  await db.query("INSERT INTO reserve_services(id,provider_id,organization_id,location_id,name,description,minutes,price,enabled) VALUES('other-service','other-provider','another-shop','another-location','Private','',45,1000,true)");
  assert.ok(!(await catalog(db)).some((s) => s.id === "other-service"));
  const foreignActor: Actor = { ...client, id: "other-client", organization_id: "another-shop" };
  await assert.rejects(book(db, foreignActor, input(time())), /Organization not found/);
  await assert.rejects(visits(db, foreignActor, true), /Organization not found/);
  await assert.rejects(
    db.query("INSERT INTO reserve_services(id,provider_id,name,description,minutes,price,organization_id,location_id) VALUES('bad-link','other-provider','Invalid','',45,1000,'reserve-at-sanctum','eunice-sanctum')"),
    /foreign key constraint/,
  );
});
