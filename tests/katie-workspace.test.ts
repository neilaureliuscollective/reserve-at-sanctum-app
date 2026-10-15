import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { DateTime } from "luxon";
import { schema, seed, wrapPglite, type Database } from "../lib/db";
import { book, availability, type Actor } from "../lib/booking";
import {
  businessWorkspace,
  mutateBusinessWorkspace,
  suppressBusinessLegacyAccess,
  businessEntrance,
} from "../lib/business-workspace";
import {
  reserveAuthDelivery,
  confirmationRedirect,
  appOrigin,
} from "../lib/auth-confirmation";
import { canAccess } from "../lib/booking";
import { hasCapability } from "../lib/studio-permissions";
let pg: PGlite, db: Database;
const katie: Actor = {
  id: "preview-katie",
  role: "client",
  name: "Synthetic Katie",
  email: "k@preview.invalid",
  provider_id: null,
};
const client: Actor = { ...katie, id: "preview-client" },
  other: Actor = { ...katie, id: "preview-other" };
const business = "synthetic-fix-it";
const future = DateTime.now()
  .setZone("America/Chicago")
  .plus({ days: 15 })
  .startOf("day");
let day = future;
while (day.weekday > 5 || day.weekday === 1) day = day.plus({ days: 1 });
let appointmentId: string;
before(async () => {
  process.env.RESERVE_BUSINESS_AUTHORITY_ENABLED = "true";
  process.env.RESERVE_DEV_PREVIEW = "true";
  pg = new PGlite();
  await pg.waitReady;
  db = wrapPglite(pg);
  await schema(db);
  await seed(db);
  await db.query(
    "INSERT INTO reserve_businesses(id,slug,display_name,created_by) VALUES($1,'fix-it-shop','Synthetic Fix It Shop','preview-neil'),('synthetic-other','other','Other synthetic business','preview-neil')",
    [business],
  );
  await db.query(
    "INSERT INTO reserve_business_memberships(business_id,user_id,role,verified_at,verified_by) VALUES($1,'preview-katie','business_owner',now(),'preview-neil'),('synthetic-other','preview-other','business_owner',now(),'preview-neil')",
    [business],
  );
  await db.query(
    "INSERT INTO reserve_business_providers(business_id,provider_id) VALUES($1,'katie')",
    [business],
  );
  await db.query(
    "INSERT INTO reserve_business_locations(business_id,location_id) VALUES($1,'eunice')",
    [business],
  );
  await db.query(
    "INSERT INTO reserve_business_provider_locations(business_id,provider_id,location_id) VALUES($1,'katie','eunice')",
    [business],
  );
});
after(async () => {
  await pg.close();
  delete process.env.RESERVE_BUSINESS_AUTHORITY_ENABLED;
  delete process.env.RESERVE_DEV_PREVIEW;
});
test("owner configuration reuses services and revisions without global or Chair authority", async () => {
  assert.equal(await businessEntrance(db, katie), "/fix-it-shop/manage");
  const data = await businessWorkspace(db, katie, business, day.toISODate()!);
  const service = data.services.find((s) => s.id === "signature")!;
  await mutateBusinessWorkspace(db, katie, business, {
    action: "configure",
    acknowledge: false,
    input: {
      kind: "service",
      provider_id: "katie",
      service_id: "signature",
      target_revision: service.revision,
      name: "Synthetic approved service",
      description: "Synthetic fixture only",
      minutes: 25,
      buffer: 5,
      price: 3200,
      enabled: true,
    },
  });
  assert.equal(
    (
      await businessWorkspace(db, katie, business, day.toISODate()!)
    ).services.find((s) => s.id === "signature")?.minutes,
    25,
  );
  await assert.rejects(
    mutateBusinessWorkspace(db, katie, business, {
      action: "configure",
      acknowledge: false,
      input: {
        kind: "service",
        provider_id: "other",
        name: "Forbidden",
        description: "Forbidden service",
        target_revision: 0,
        minutes: 25,
        buffer: 5,
        price: 100,
        enabled: true,
      },
    }),
    /outside/,
  );
  assert.equal(hasCapability(katie, "chair.read"), false);
  assert.equal(hasCapability(katie, "operations.configure"), false);
});
test("customer booking is persisted and the same appointment survives fresh owner reads; competing requests cannot double book", async () => {
  const slots = await availability(db, "signature", day.toISODate()!);
  assert.ok(slots.length);
  const results = await Promise.allSettled([
    book(db, client, {
      serviceId: "signature",
      start: slots[0].start,
      note: "Synthetic private note",
      requestKey: "00000000-0000-4000-8000-000000000001",
    }),
    book(db, other, {
      serviceId: "signature",
      start: slots[0].start,
      note: "Synthetic private note",
      requestKey: "00000000-0000-4000-8000-000000000002",
    }),
  ]);
  assert.equal(
    results.filter((r) => r.status === "fulfilled").length,
    1,
    results
      .map((r) => (r.status === "rejected" ? String(r.reason) : "saved"))
      .join(";"),
  );
  const winner = results.find((r) => r.status === "fulfilled");
  assert.ok(winner?.status === "fulfilled");
  appointmentId = winner.value.id;
  const a = await businessWorkspace(
    db,
    { ...katie },
    business,
    day.toISODate()!,
  );
  assert.equal(a.appointments[0].id, appointmentId);
  assert.equal(a.appointments[0].service_name, "Synthetic approved service");
  assert.doesNotMatch(
    JSON.stringify(a.appointments),
    /email|private|note|request_key|client_id/,
  );
  await assert.rejects(
    businessWorkspace(db, other, business, day.toISODate()!),
    /not authorized/,
  );
  await assert.rejects(
    mutateBusinessWorkspace(db, other, "synthetic-other", {
      action: "appointment",
      id: appointmentId,
      revision: 1,
      change: "cancel",
    }),
    /outside/,
  );
});
test("rescheduling and cancellation release slots atomically, preserve snapshots, and reject stale revisions", async () => {
  const [a] = await db.query("SELECT * FROM reserve_appointments WHERE id=$1", [
    appointmentId,
  ]);
  const slots = await availability(db, "signature", day.toISODate()!);
  const start = slots.at(-1)!.start;
  await mutateBusinessWorkspace(db, katie, business, {
    action: "appointment",
    id: appointmentId,
    revision: a.revision,
    change: "reschedule",
    start,
  });
  await assert.rejects(
    mutateBusinessWorkspace(db, katie, business, {
      action: "appointment",
      id: appointmentId,
      revision: a.revision,
      change: "cancel",
    }),
    /changed/,
  );
  const [updated] = await db.query(
    "SELECT * FROM reserve_appointments WHERE id=$1",
    [appointmentId],
  );
  assert.equal(updated.price, a.price);
  assert.equal(
    (
      await db.query(
        "SELECT * FROM reserve_occupancy WHERE provider_id=$1 AND starts_at=$2",
        ["katie", a.starts_at],
      )
    ).length,
    0,
  );
  await mutateBusinessWorkspace(db, katie, business, {
    action: "appointment",
    id: appointmentId,
    revision: updated.revision,
    change: "cancel",
  });
  assert.equal(
    (
      await db.query(
        "SELECT * FROM reserve_occupancy WHERE appointment_id=$1",
        [appointmentId],
      )
    ).length,
    0,
  );
});
test("business availability blocks release slots and implicit locations cannot cross scope", async () => {
  await mutateBusinessWorkspace(db, katie, business, {action:"block",provider:"katie",date:day.toISODate(),start:"09:00",end:"10:00"});
  let data=await businessWorkspace(db,katie,business,day.toISODate()!);
  const block=data.blocks[0]; assert.ok(block);
  const slots=await availability(db,"signature",day.toISODate()!);
  assert.ok(slots.every(slot=>DateTime.fromISO(slot.start).setZone("America/Chicago").hour>=10));
  await assert.rejects(mutateBusinessWorkspace(db,other,"synthetic-other",{action:"unblock",provider:"katie",id:block.id}),/outside/);
  await mutateBusinessWorkspace(db,katie,business,{action:"unblock",provider:"katie",id:block.id});
  assert.equal(DateTime.fromISO((await availability(db,"signature",day.toISODate()!))[0].start).setZone("America/Chicago").hour,9);
  await db.query("DELETE FROM reserve_business_provider_locations WHERE business_id=$1",[business]);
  const provider=data.providers[0];
  await assert.rejects(mutateBusinessWorkspace(db,katie,business,{action:"configure",acknowledge:false,input:{kind:"provider",provider_id:"katie",target_revision:provider.revision,name:"Synthetic Katie",open_hour:9,close_hour:17,weekdays:[2,3,4,5,6],enabled:true}}),/Location is outside/);
  await db.query("INSERT INTO reserve_business_provider_locations(business_id,provider_id,location_id) VALUES($1,'katie','eunice')",[business]);
});
test("revoked memberships cannot retain a legacy staff bypass and customer permissions survive", async () => {
  const legacy = { ...katie, role: "operator" as const, provider_id: "katie" };
  await db.query(
    "UPDATE reserve_business_memberships SET revoked_at=now() WHERE business_id=$1",
    [business],
  );
  const sanitized = await suppressBusinessLegacyAccess(db, legacy);
  assert.equal(sanitized.role, "client");
  assert.equal(hasCapability(sanitized, "appointments.read"), false);
  assert.equal(await businessEntrance(db, sanitized), null);
  await assert.rejects(
    businessWorkspace(db, legacy, business, day.toISODate()!),
    /not authorized/,
  );
  const [a] = await db.query<any>(
    "SELECT * FROM reserve_appointments WHERE id=$1",
    [appointmentId],
  );
  assert.equal(canAccess(sanitized, a), false);
  assert.equal(canAccess({ ...sanitized, id: a.client_id }, a), true);
});
test("confirmation delivery has atomic per-address and global budgets with validated return origin", async () => {
  const result = await Promise.all([
    reserveAuthDelivery(db, "Synthetic@preview.invalid"),
    reserveAuthDelivery(db, "synthetic@preview.invalid"),
  ]);
  assert.equal(result.filter(Boolean).length, 1);
  const env = { APP_ORIGIN: "https://booking.example", NODE_ENV: "production" };
  assert.equal(
    confirmationRedirect("/fix-it-shop/manage", env),
    "https://booking.example/auth/callback?next=%2Ffix-it-shop%2Fmanage",
  );
  for (const next of [
    "//evil.example",
    "https://evil.example",
    "/\\evil.example",
    "/\ninvalid",
  ])
    assert.equal(
      new URL(confirmationRedirect(next, env)).searchParams.get("next"),
      "/enter",
    );
  assert.throws(
    () =>
      appOrigin({
        APP_ORIGIN: "http://localhost:3000",
        NODE_ENV: "production",
      }),
    /safely/,
  );
  assert.throws(
    () => appOrigin({ APP_ORIGIN: "https://booking.example/other" }),
    /safely/,
  );
  for (let i = 0; i < 35; i++)
    await reserveAuthDelivery(db, `synthetic${i}@preview.invalid`);
  assert.equal(await reserveAuthDelivery(db, "last@preview.invalid"), false);
});
