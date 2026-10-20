import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { DateTime } from "luxon";
import { schema, seed, wrapPglite, type Database } from "../lib/db";
import { book, change, type Actor } from "../lib/booking";
import { bookingMessages, confirmManualMessage } from "../lib/booking-pilot";
import { deliveryConfig, deliveryAuthorized, deliverBookingMessages, sendBookingEmail, type Sender } from "../lib/booking-delivery";
import { POST } from "../app/api/internal/booking-messages/route";
const config = { key: "mock", from: "Fix It Shop <booking@example.com>", origin: "https://booking.example.com", secret: "a".repeat(32), notBefore: "2020-01-01T00:00:00Z" };
const client: Actor = { id: "preview-client", name: "Synthetic", email: "synthetic@example.com", role: "client", provider_id: null };
const staff: Actor = { id: "preview-katie", name: "Katie", email: "staff@example.com", role: "operator", provider_id: "katie" };
let pg: PGlite, db: Database;
before(async () => { pg = new PGlite(); await pg.waitReady; db = wrapPglite(pg); await schema(db); await seed(db); });
after(async () => { await pg.close(); });
beforeEach(async () => { await db.query("DELETE FROM reserve_booking_messages"); await db.query("DELETE FROM reserve_occupancy"); await db.query("DELETE FROM reserve_audit"); await db.query("DELETE FROM reserve_appointments"); await db.query("UPDATE reserve_users SET email=$2 WHERE id=$1", [client.id, client.email]); await db.query("UPDATE reserve_clients SET email=$2 WHERE user_id=$1", [client.id, client.email]); });
function input() {
  let day = DateTime.now().setZone("America/Chicago").startOf("day").plus({ days: 3 });
  while (![2,3,4,5,6].includes(day.weekday)) day = day.plus({ days: 1 });
  return { serviceId: "signature", start: day.set({ hour: 10 }).toUTC().toISO()!, requestKey: randomUUID(), note: "Private note must never be emailed" };
}
const retryDue = () => db.query("UPDATE reserve_booking_messages SET available_at=now() WHERE kind<>'reminder'");
const messages = () => db.query<{state: string; attempts: number}>("SELECT state,attempts FROM reserve_booking_messages WHERE kind<>'reminder'");
test("email remains disabled and worker authorization fails closed", async () => {
  assert.equal(deliveryConfig({}), null);
  assert.throws(() => deliveryConfig({ RESERVE_BOOKING_EMAIL_ENABLED: "true" }), /incomplete/);
  assert.equal(deliveryAuthorized(null, config.secret), false);
  assert.equal(deliveryAuthorized(`Bearer ${config.secret}`, config.secret), true);
  const previous = process.env.RESERVE_BOOKING_EMAIL_ENABLED;
  process.env.RESERVE_BOOKING_EMAIL_ENABLED = "false";
  try { assert.equal((await POST(new Request("https://example.com", { method: "POST" }))).status, 503); }
  finally { if (previous === undefined) delete process.env.RESERVE_BOOKING_EMAIL_ENABLED; else process.env.RESERVE_BOOKING_EMAIL_ENABLED = previous; }
});
test("provider sees a committed booking; concurrent workers and booking retries send once", async () => {
  const request = input(), a = await book(db, client, request);
  await book(db, client, request);
  let sends = 0;
  const send: Sender = async m => { assert.equal(m.appointment_id, a.id); sends++; };
  await Promise.all([deliverBookingMessages(db, config, send), deliverBookingMessages(db, config, send)]);
  assert.equal(sends, 1); assert.equal((await messages())[0].state, "sent");
  assert.equal((await db.query("SELECT id FROM reserve_appointments" )).length, 1);
});
test("three email failures keep booking and occupancy intact and return to staff manual follow-up", async () => {
  const a = await book(db, client, input());
  let sends = 0;
  const send: Sender = async () => { sends++; throw Error("Provider timeout"); };
  for (let i=0;i<3;i++) { await retryDue(); await deliverBookingMessages(db, config, send); }
  await retryDue(); await deliverBookingMessages(db, config, send);
  assert.equal(sends, 3); assert.equal((await messages())[0].state, "manual_required");
  assert.equal((await db.query("SELECT status FROM reserve_appointments WHERE id=$1", [a.id]))[0].status, "confirmed");
  assert.equal((await db.query("SELECT * FROM reserve_occupancy WHERE appointment_id=$1", [a.id])).length, 4);
  const rows = await bookingMessages(db, staff); assert.equal(rows.length, 1);
  await confirmManualMessage(db, staff, rows[0].id as string);
  await deliverBookingMessages(db, config, send); assert.equal(sends, 3);
});
test("cancel and reschedule supersede old confirmation/reminders", async () => {
  const request = input(), a = await book(db, client, request);
  const next = DateTime.fromISO(request.start).plus({ hours: 2 }).toISO()!;
  await change(db, client, a.id, { action: "reschedule", start: next, revision: 1 });
  const kinds: string[] = [];
  const send: Sender = async m => { kinds.push(m.kind); assert.equal(m.revision, 2); };
  await deliverBookingMessages(db, config, send); assert.deepEqual(kinds, ["reschedule"]);
  await change(db, client, a.id, { action: "cancel", revision: 2 });
  await deliverBookingMessages(db, config, async m => { kinds.push(m.kind); assert.equal(m.revision, 3); });
  assert.deepEqual(kinds, ["reschedule", "cancel"]);
});
test("retries stop before provider idempotency expiry and missing contacts never send", async () => {
  await book(db, client, input());
  await db.query("UPDATE reserve_booking_messages SET state='failed',attempts=1,handled_at=now()-interval '24 hours',available_at=now() WHERE kind='booked'");
  let sends = 0;
  await deliverBookingMessages(db, config, async () => { sends++; });
  assert.equal(sends, 0); assert.equal((await messages())[0].state, "manual_required");
  await db.query("UPDATE reserve_clients SET email='' WHERE user_id=$1", [client.id]);
  await db.query("UPDATE reserve_users SET email='synthetic@preview.invalid' WHERE id=$1", [client.id]);
  await db.query("UPDATE reserve_booking_messages SET attempts=0,handled_at=NULL WHERE kind='booked'");
  await deliverBookingMessages(db, config, async () => { sends++; }); assert.equal(sends, 0);
});
test("email uses stable deduplication key, local timezone and captured price without private notes", async () => {
  await book(db, client, input());
  await deliverBookingMessages(db, config, async (m,c) => {
    let key = "";
    const transport: typeof fetch = async (_url, options) => {
      key = (options!.headers as Record<string,string>)["Idempotency-Key"];
      const body = JSON.parse(options!.body as string);
      assert.match(body.text, /CDT|CST/); assert.match(body.text, /45 minutes · \$45.00/);
      assert.doesNotMatch(body.text, /Private note/); assert.equal(body.to[0], client.email);
      return Response.json({ id: "mock-provider-id" });
    };
    await sendBookingEmail(m,c,transport); await sendBookingEmail(m,c,transport);
    assert.equal(key, `booking/${m.id}`);
    await assert.rejects(sendBookingEmail(m,c,async () => Response.json({}, { status: 429 })), /rejected/);
    await assert.rejects(sendBookingEmail(m,c,async () => Response.json({})), /not confirmed/);
  });
});
test("provider acceptance followed by DB failure retries with the same key and preserves the first-attempt window", async () => {
  await book(db, client, input());
  const ids: string[] = [];
  const failingDb: Database = { query: db.query, transaction: fn => db.transaction(tx => fn({ query: async (sql,params) => {
    if (sql.includes("SET state='sent'")) throw Error("Connection lost before status commit");
    return tx.query(sql,params);
  } })) };
  await assert.rejects(deliverBookingMessages(failingDb,config,async m => { ids.push(m.id); }), /Connection lost/);
  assert.equal((await messages())[0].state,"failed");
  const [first] = await db.query<{ handled_at: Date }>("SELECT handled_at FROM reserve_booking_messages WHERE kind='booked'");
  await retryDue();
  await deliverBookingMessages(db,config,async m => { ids.push(m.id); });
  assert.equal(ids.length,2); assert.equal(ids[0],ids[1]);
  const [second] = await db.query<{ handled_at: Date }>("SELECT handled_at FROM reserve_booking_messages WHERE kind='booked'");
  assert.equal(new Date(first.handled_at).getTime(),new Date(second.handled_at).getTime());
});
test("elapsed reminders are suppressed and staff scope cannot handle another professional's message", async () => {
  const a = await book(db,client,input());
  await db.query("UPDATE reserve_booking_messages SET state='confirmed_manual' WHERE kind='booked'");
  await db.query("UPDATE reserve_booking_messages SET available_at=now() WHERE kind='reminder'");
  await db.query("UPDATE reserve_appointments SET starts_at=now()-interval '1 hour' WHERE id=$1",[a.id]);
  const reminders = await bookingMessages(db,staff); assert.equal(reminders.length,0);
  let sends=0; await deliverBookingMessages(db,config,async () => { sends++; }); assert.equal(sends,0);
  assert.equal((await db.query("SELECT state FROM reserve_booking_messages WHERE kind='reminder'"))[0].state,"superseded");
  const [message] = await db.query<{ id: string }>("SELECT id FROM reserve_booking_messages WHERE kind='booked'");
  await assert.rejects(confirmManualMessage(db,{ ...staff,provider_id:"other" },message.id),/unavailable/);
});
test("activation cutoff never automatically sends historical queued updates", async () => {
  await book(db,client,input()); let sends=0;
  const future = { ...config, notBefore: new Date(Date.now()+60000).toISOString() };
  await deliverBookingMessages(db,future,async () => { sends++; });
  assert.equal(sends,0); assert.equal((await messages())[0].attempts,0);
});
