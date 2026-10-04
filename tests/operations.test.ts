import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import { PGlite } from "@electric-sql/pglite";
import { schema, seed, wrapPglite } from "../lib/db";
import { book, change, visits, catalog, type Actor } from "../lib/booking";
import { configure, configuration } from "../domains/operations/configuration";
import {
  createCustomer,
  inviteCustomer,
  claimCustomer,
} from "../domains/customers";
import { resolveAccess } from "../domains/access";
import { collect, reconciliation } from "../domains/collections";
import {
  dispatch,
  deliveryQueue,
  retryDelivery,
} from "../domains/communications";
import { saveChair, listChairs } from "../lib/chair-store";
import { emptyChair } from "../lib/chair";
const pg = new PGlite();
const db = wrapPglite(pg);
let owner: Actor, provider: Actor, client: Actor, manager: Actor;
const future = DateTime.now()
  .setZone("America/Chicago")
  .plus({ days: 2 })
  .set({ hour: 10, minute: 0, second: 0, millisecond: 0 });
function input(
  serviceId: string,
  start = future.toUTC().toISO()!,
  customerId?: string,
) {
  return {
    serviceId,
    start,
    note: "",
    requestKey: randomUUID(),
    ...(customerId ? { customerId } : {}),
  };
}
test.before(async () => {
  await pg.waitReady;
  await schema(db);
  await seed(db);
  owner = await resolveAccess(
    db,
    (
      await db.query<Actor>(
        "SELECT * FROM reserve_users WHERE id='preview-neil'",
      )
    )[0],
  );
  client = await resolveAccess(
    db,
    (
      await db.query<Actor>(
        "SELECT * FROM reserve_users WHERE id='preview-client'",
      )
    )[0],
  );
  provider = {
    ...(
      await db.query<Actor>(
        "SELECT * FROM reserve_users WHERE id='preview-katie'",
      )
    )[0],
    assignments: [
      {
        organization_id: "reserve",
        location_id: "eunice",
        provider_id: "katie",
        role: "provider",
      },
    ],
  };
  manager = {
    ...provider,
    assignments: [
      {
        organization_id: "reserve",
        location_id: "eunice",
        provider_id: null,
        role: "manager",
      },
    ],
  };
  await configure(db, owner, {
    action: "location",
    name: "Reserve test second location",
    slug: "location-two",
    timezone: "America/Chicago",
    status: "pilot",
    booking_enabled: true,
  });
  await configure(db, owner, {
    action: "provider",
    locationId: "location-two",
    id: "katie",
    name: "Katie Guidry",
    slug: "katie",
    enabled: true,
    brand: "Fix It Shop",
  });
  await configure(db, owner, {
    action: "provider",
    locationId: "location-two",
    id: "second-provider",
    name: "Test provider",
    slug: "test-provider",
    enabled: true,
    brand: "Optional brand",
  });
  await configure(db, owner, {
    action: "resource",
    locationId: "location-two",
    id: "test-chair",
    name: "Shared chair",
  });
  for (const locationId of ["eunice", "location-two"])
    for (const providerId of locationId === "eunice"
      ? [null, "katie"]
      : [null, "katie", "second-provider"])
      await configure(db, owner, {
        action: "hours",
        locationId,
        providerId,
        weekday: future.weekday,
        intervals: [{ start: 540, end: 1020 }],
      });
  for (const [id, providerId, locationId] of [
    ["test-eunice", "katie", "eunice"],
    ["test-two", "katie", "location-two"],
    ["test-other", "second-provider", "location-two"],
  ])
    await configure(db, owner, {
      action: "service",
      locationId,
      providerId,
      id,
      name: "Approved test service",
      minutes: 45,
      buffer: 15,
      price: 5000,
      enabled: true,
      resourceId: locationId === "location-two" ? "test-chair" : null,
    });
});
test.after(() => pg.close());
test("second location config works without app cloning and provider cannot leak across locations", async () => {
  assert.equal((await catalog(db, "location-two")).length, 2);
  await assert.rejects(
    () => configuration(db, provider, "location-two"),
    /access/,
  );
  const guest = await createCustomer(db, owner, "location-two", "katie", {
    name: "Test guest",
    email: "guest@example.test",
  });
  const a = await book(
    db,
    owner,
    input("test-two", future.toUTC().toISO()!, guest.id),
  );
  assert.equal(a.client_id, null);
  assert.equal(a.snapshot.location, "Reserve test second location");
  assert.equal(
    (await visits(db, provider, true)).some((v) => v.id === a.id),
    false,
  );
  assert.equal(
    (await visits(db, owner, true)).some((v) => v.id === a.id),
    true,
  );
  await assert.rejects(() => book(db, client, input("test-eunice")), /taken/);
  await assert.rejects(() => book(db, client, input("test-other")), /taken/);
  await change(db, owner, a.id, { action: "cancel", revision: 1 });
  const b = await book(db, client, input("test-eunice"));
  assert.equal(b.price, 5000);
  await change(db, owner, b.id, { action: "cancel", revision: 1 });
});
test("resource competition across different providers produces one atomic winner", async () => {
  const results = await Promise.allSettled([
    book(db, client, input("test-two")),
    book(db, client, input("test-other")),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const winner = results.find((r) => r.status === "fulfilled");
  if (winner?.status === "fulfilled")
    await change(db, owner, winner.value.id, { action: "cancel", revision: 1 });
});
test("hours edits protect existing bookings and service edits preserve booked terms", async () => {
  const a = await book(db, client, input("test-eunice"));
  await assert.rejects(
    () =>
      configure(db, owner, {
        action: "hours",
        locationId: "eunice",
        providerId: "katie",
        weekday: future.weekday,
        closed: true,
        intervals: [],
      }),
    /invalidate/,
  );
  await configure(db, owner, {
    action: "service",
    id: "test-eunice",
    locationId: "eunice",
    providerId: "katie",
    name: "Changed service",
    minutes: 30,
    buffer: 15,
    price: 9900,
    enabled: true,
    revision: 1,
  });
  const updated = (await visits(db, client)).find((v) => v.id === a.id)!;
  assert.equal(updated.price, 5000);
  assert.equal(updated.service_name, "Approved test service");
  await change(db, owner, a.id, { action: "cancel", revision: 1 });
});
test("visit outcomes are operator-only and never imply payment", async () => {
  const a = await book(db, client, input("test-eunice"));
  await db.query(
    "UPDATE reserve_appointments SET starts_at=now()-interval '20 minutes' WHERE id=$1",
    [a.id],
  );
  await assert.rejects(
    () => change(db, client, a.id, { action: "check_in", revision: 1 }),
    /access/,
  );
  const arrived = await change(db, provider, a.id, {
    action: "check_in",
    revision: 1,
  });
  await assert.rejects(
    () => change(db, provider, a.id, { action: "complete", revision: 1 }),
    /changed/,
  );
  const complete = await change(db, provider, a.id, {
    action: "complete",
    revision: arrived.revision,
  });
  assert.equal(complete.status, "completed");
  assert.equal(
    (
      await db.query(
        "SELECT * FROM reserve_external_collections WHERE appointment_id=$1",
        [a.id],
      )
    ).length,
    0,
  );
  const request = {
    action: "record",
    appointmentId: a.id,
    amount: 4500,
    method: "external",
    reference: "POS-test",
    requestKey: randomUUID(),
  };
  await assert.rejects(() => collect(db, provider, request), /access/);
  const receipt = await collect(db, manager, request);
  assert.equal((await collect(db, manager, request)).id, receipt.id);
  await collect(db, manager, {
    action: "reverse",
    id: receipt.id,
    reason: "Incorrect receipt",
  });
  const rows = await reconciliation(
    db,
    manager,
    "eunice",
    DateTime.now().setZone("America/Chicago").toISODate()!,
  );
  assert.equal(
    rows.find((r) => r.id === receipt.id)?.reversal_reason,
    "Incorrect receipt",
  );
});
test("email retries carry stable transport idempotency and old reminders are suppressed", async () => {
  const a = await book(
    db,
    client,
    input("test-other", future.plus({ hours: 2 }).toUTC().toISO()!),
  );
  const sent: string[] = [];
  await dispatch(
    db,
    async (message) => {
      sent.push(message.id);
      return "mock-delivery";
    },
    50,
  );
  const rows = await db.query<{ state: string }>(
    "SELECT state FROM reserve_outbox WHERE appointment_id=$1 AND kind='confirmed'",
    [a.id],
  );
  assert.equal(rows[0].state, "sent");
  const moved = await change(db, owner, a.id, {
    action: "reschedule",
    revision: 1,
    start: future.plus({ hours: 3 }).toUTC().toISO()!,
  });
  await dispatch(
    db,
    async () => {
      throw Error("transport_failed");
    },
    50,
  );
  const queue = await deliveryQueue(db, owner, "location-two");
  const failed = queue.find(
    (r) => r.appointment_id === a.id && r.kind === "rescheduled",
  );
  assert.equal(failed?.state, "failed");
  await retryDelivery(db, owner, String(failed!.id));
  await dispatch(db, async (message) => {
    sent.push(message.id);
    return "mock-retry";
  });
  await change(db, owner, a.id, { action: "cancel", revision: moved.revision });
  await dispatch(db, async (message) => {
    sent.push(message.id);
    return "mock-cancel";
  });
  assert.equal(new Set(sent).size, sent.length);
  assert.equal(
    (
      await db.query(
        "SELECT id FROM reserve_outbox WHERE appointment_id=$1 AND kind='reminder' AND state='pending'",
        [a.id],
      )
    ).length,
    0,
  );
});
test("hospitality context stays provider scoped; managers and owner have no blanket access", async () => {
  const a = await book(
    db,
    client,
    input("test-other", future.plus({ hours: 4 }).toUTC().toISO()!),
  );
  await saveChair(db, client, {
    ...emptyChair,
    provider_id: "second-provider",
    share_with_katie: true,
    save_life: true,
    life: "Been better.",
    load: "Work",
  });
  assert.equal((await listChairs(db, provider)).length, 0);
  await assert.rejects(() => listChairs(db, owner), /provider access/);
  await assert.rejects(() => listChairs(db, manager), /provider access/);
  const other = {
    ...provider,
    assignments: [
      {
        organization_id: "reserve",
        location_id: "location-two",
        provider_id: "second-provider",
        role: "provider" as const,
      },
    ],
  };
  assert.equal((await listChairs(db, other))[0].life, "Been better.");
  await saveChair(db, client, {
    ...emptyChair,
    provider_id: "second-provider",
    revision: 1,
    share_with_katie: false,
  });
  assert.equal((await listChairs(db, other)).length, 0);
  await change(db, owner, a.id, { action: "cancel", revision: 1 });
});
test("guest history requires token and matching verified email, never email-only auto merge", async () => {
  const guest = await createCustomer(
    db,
    owner,
    "location-two",
    "second-provider",
    { name: "Claimable guest", email: "jordan@preview.invalid" },
  );
  const invite = await inviteCustomer(db, owner, guest.id, "location-two");
  const token = invite.url.split("#")[1];
  await assert.rejects(() => claimCustomer(db, client, token), /Verify/);
  await db.query(
    "UPDATE reserve_users SET identity_verified=true WHERE id=$1",
    [client.id],
  );
  await assert.rejects(
    () => claimCustomer(db, { ...client, email: "wrong@example.test" }, token),
    /another verified/,
  );
  await claimCustomer(db, client, token);
  assert.equal(
    (
      await db.query("SELECT auth_user_id FROM reserve_customers WHERE id=$1", [
        guest.id,
      ])
    )[0].auth_user_id,
    client.id,
  );
  await assert.rejects(() => claimCustomer(db, client, token), /invalid/);
});
test("staff grants reject unverified identities and migration ledger replays safely", async () => {
  await assert.rejects(
    () =>
      configure(db, owner, {
        action: "access",
        locationId: "eunice",
        userId: randomUUID(),
        role: "manager",
      }),
    /verified/,
  );
  const before = (await db.query("SELECT * FROM reserve_migrations")).length;
  await schema(db);
  assert.equal(
    (await db.query("SELECT * FROM reserve_migrations")).length,
    before,
  );
  await db.query(
    "UPDATE reserve_migrations SET checksum='changed' WHERE name='007_guest_claim.sql'",
  );
  await assert.rejects(() => schema(db), /Applied migration changed/);
});
