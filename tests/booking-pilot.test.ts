import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { DateTime } from "luxon";
import { schema, seed, wrapPglite, type Database } from "../lib/db";
import {
  book,
  change,
  visits,
  availability,
  validateTime,
  type Actor,
} from "../lib/booking";
import {
  createPilotClient,
  importPilotClients,
  manualAppointment,
  pilotClients,
  pilotHistory,
  bookingMessages,
  confirmManualMessage,
  configurePilotLocation,
} from "../lib/booking-pilot";
import { blockTime } from "../lib/studio-blocks";
import { proposeOperation, applyOperation } from "../lib/studio-operations";
import { parseClientCsv } from "../lib/client-csv";
let pg: PGlite, db: Database;
const staff: Actor = {
  id: "preview-katie",
  name: "Katie",
  email: "katie@preview.invalid",
  role: "operator",
  provider_id: "katie",
};
const owner: Actor = {
  id: "preview-neil",
  name: "Neil",
  email: "neil@preview.invalid",
  role: "owner",
  provider_id: null,
};
const client: Actor = {
  id: "preview-client",
  name: "Jordan",
  email: "jordan@preview.invalid",
  role: "client",
  provider_id: null,
};
let offset = 2;
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
const raw = (name = "Pilot client") => ({
  name,
  email: "pilot@example.invalid",
  phone: "3375550100",
  sourceKey: randomUUID(),
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
test("CRM has no fake login; contacts normalize, duplicate retries and provider boundaries are enforced", async () => {
  const input = raw();
  const a = await createPilotClient(db, staff, "katie", input);
  assert.equal(a.client.user_id, null);
  assert.equal(a.client.phone, "+13375550100");
  assert.equal(
    (await createPilotClient(db, staff, "katie", input)).client.id,
    a.client.id,
  );
  await assert.rejects(
    createPilotClient(db, staff, "katie", {
      ...input,
      sourceKey: randomUUID(),
    }),
    /already uses/,
  );
  await assert.rejects(
    createPilotClient(db, client, "katie", input),
    /Studio access/,
  );
  await assert.rejects(
    pilotClients(db, { ...staff, provider_id: "other" }, "katie"),
    /Provider access/,
  );
});
test("manual visits share conflict protection, persist without client signup and keep CRM when staff reschedules", async () => {
  const { client: c } = await createPilotClient(db, staff, "katie", {
    name: "Manual",
    phone: "3375550111",
    sourceKey: randomUUID(),
  });
  const input = {
    provider: "katie",
    clientId: c.id,
    serviceId: "signature",
    locationId: "eunice",
    start: time(),
    note: "Natural finish",
    requestKey: randomUUID(),
  };
  const a = await manualAppointment(db, staff, input);
  assert.equal(a.client_id, null);
  assert.equal((await manualAppointment(db, staff, input)).id, a.id);
  await assert.rejects(
    manualAppointment(db, staff, { ...input, note: "Changed" }),
    /already used/,
  );
  assert.ok(
    (await visits(db, staff, true)).some(
      (r) => r.id === a.id && r.client_name === "Manual",
    ),
  );
  assert.ok(!(await visits(db, client)).some((r) => r.id === a.id));
  await assert.rejects(
    book(db, client, {
      serviceId: "signature",
      start: input.start,
      note: "",
      requestKey: randomUUID(),
    }),
    /just taken/,
  );
  const updated = await change(db, staff, a.id, {
    action: "reschedule",
    start: time(),
    revision: 1,
  });
  assert.equal(updated.crm_client_id, c.id);
  assert.equal(updated.client_id, null);
  const history = await pilotHistory(db, staff, c.id);
  assert.equal(history.visits[0].id, a.id);
  const queue = await db.query(
    "SELECT * FROM reserve_booking_messages WHERE appointment_id=$1 AND state='manual_required'",
    [a.id],
  );
  assert.equal(queue.length, 2);
  assert.ok(queue.every((m) => m.revision === 2));
  await change(db, staff, a.id, { action: "cancel", revision: 2 });
  assert.equal(
    (
      await db.query(
        "SELECT * FROM reserve_occupancy WHERE appointment_id=$1",
        [a.id],
      )
    ).length,
    0,
  );
  const pending = await bookingMessages(db, staff);
  const cancel = pending.find(
    (m) => m.appointment_id === a.id && m.kind === "cancel",
  );
  assert.ok(cancel);
  await assert.rejects(
    confirmManualMessage(
      db,
      { ...staff, provider_id: "other" },
      String(cancel.id),
    ),
    /unavailable/,
  );
  await confirmManualMessage(db, staff, String(cancel.id));
});
test("online booking creates only its own account link; operator reschedule cannot replace it", async () => {
  const a = await book(db, client, {
    serviceId: "signature",
    start: time(),
    note: "",
    requestKey: randomUUID(),
  });
  const b = await change(db, staff, a.id, {
    action: "reschedule",
    start: time(),
    revision: 1,
  });
  assert.equal(b.crm_client_id, a.crm_client_id);
  assert.equal(b.client_id, client.id);
  const manual = await manualAppointment(db, staff, {
    provider: "katie",
    clientId: a.crm_client_id,
    serviceId: "signature",
    locationId: "eunice",
    start: time(),
    note: "",
    requestKey: randomUUID(),
  });
  assert.equal(manual.client_id, client.id);
});
test("imports preview conflicts, roll back an ambiguous batch, and repeated exports reuse records", async () => {
  const rows = [
    { name: "Imported A", email: "import-a@example.invalid", sourceKey: "a" },
    { name: "Imported B", phone: "3375550122", sourceKey: "b" },
  ];
  const preview = await importPilotClients(db, staff, "katie", "export", rows);
  assert.ok("preview" in preview);
  assert.equal(preview.preview.length, 2);
  assert.deepEqual(
    await importPilotClients(db, staff, "katie", "export", rows, true),
    { created: 2, reused: 0 },
  );
  assert.deepEqual(
    await importPilotClients(db, staff, "katie", "export", rows, true),
    { created: 0, reused: 2 },
  );
  const count = (await pilotClients(db, staff, "katie")).length;
  await assert.rejects(
    importPilotClients(
      db,
      staff,
      "katie",
      "bad-export",
      [
        { name: "New", sourceKey: "new" },
        {
          name: "Collision",
          email: "import-a@example.invalid",
          sourceKey: "collision",
        },
      ],
      true,
    ),
    /already uses/,
  );
  assert.equal((await pilotClients(db, staff, "katie")).length, count);
  assert.deepEqual(
    parseClientCsv(
      'name,email,phone,source_key\r\n"Last, First",x@example.invalid,3375550133,external-7',
    )[0].name,
    "Last, First",
  );
});
test("day queries reach older appointments beyond 100 rows and provider filters deny impersonation", async () => {
  const start = time(),
    date = DateTime.fromISO(start).setZone("America/Chicago").toISODate()!;
  const a = await book(db, client, {
    serviceId: "signature",
    start,
    note: "",
    requestKey: randomUUID(),
  });
  for (let i = 0; i < 105; i++)
    await db.query(
      "INSERT INTO reserve_appointments(id,client_id,provider_id,service_id,starts_at,ends_at,busy_until,price,status,request_key,original_start,location_id) VALUES($1,$2,'katie','signature',now()+interval '90 days',now()+interval '91 days',now()+interval '91 days',4500,'cancelled',$3,now()+interval '90 days','eunice')",
      [randomUUID(), client.id, randomUUID()],
    );
  assert.ok(!(await visits(db, staff, true)).some((v) => v.id === a.id));
  assert.ok(
    (await visits(db, staff, true, 0, date, 1, "katie", "eunice")).some(
      (v) => v.id === a.id,
    ),
  );
  await assert.rejects(
    visits(db, staff, true, 0, date, 1, "other", "eunice"),
    /Provider access/,
  );
});
test("failed manual reservation versus block leaves no appointment or notification", async () => {
  const { client: c } = await createPilotClient(db, staff, "katie", {
    name: "Block test",
    sourceKey: randomUUID(),
  });
  const start = time(12),
    dt = DateTime.fromISO(start).setZone("America/Chicago");
  await blockTime(db, staff, {
    date: dt.toISODate()!,
    start: "12:00",
    end: "13:00",
  });
  const requestKey = randomUUID();
  await assert.rejects(
    manualAppointment(db, staff, {
      provider: "katie",
      clientId: c.id,
      serviceId: "signature",
      locationId: "eunice",
      start,
      note: "",
      requestKey,
    }),
    /just taken/,
  );
  assert.equal(
    (
      await db.query(
        "SELECT * FROM reserve_appointments WHERE request_key=$1",
        [requestKey],
      )
    ).length,
    0,
  );
});
test("provider creation synchronizes booking assignment and opening a location requires approved configuration", async () => {
  const proposal = await proposeOperation(db, owner, {
    kind: "provider",
    provider_id: "second",
    name: "Second",
    open_hour: 9,
    close_hour: 17,
    weekdays: [2, 3],
    enabled: false,
    target_revision: 0,
    location_id: "eunice",
  });
  await applyOperation(db, owner, proposal.id);
  assert.equal(
    (
      await db.query(
        "SELECT * FROM reserve_provider_locations WHERE provider_id='second' AND location_id='eunice'",
      )
    ).length,
    1,
  );
  await assert.rejects(
    configurePilotLocation(db, staff, {
      id: "eunice",
      address: "Actual address",
      bookingEnabled: true,
      acknowledge: true,
    }),
    /Studio access/,
  );
});
test("DST closing hour stays local clock time rather than elapsed hours from midnight", async () => {
  const now = DateTime.fromISO("2026-10-30T00:00:00", {
    zone: "America/Chicago",
  });
  const s = {
    id: "s",
    name: "DST",
    description: "",
    provider_id: "katie",
    minutes: 30,
    buffer: 0,
    price: 0,
    timezone: "America/Chicago",
  };
  await validateTime(db, s, "2026-11-01T16:30:00-06:00", now, {
    weekdays: [7],
    open_hour: 9,
    close_hour: 17,
  });
  await assert.rejects(
    validateTime(db, s, "2026-11-01T17:00:00-06:00", now, {
      weekdays: [7],
      open_hour: 9,
      close_hour: 17,
    }),
    /outside/,
  );
  const slots = await availability(
    db,
    "signature",
    DateTime.now().setZone("America/Chicago").plus({ days: 1 }).toISODate()!,
  );
  assert.ok(Array.isArray(slots));
});

test("client provider filters preserve ownership and filter before pagination", async () => {
  const filteredClient = { ...client, id: "preview-other" };
  const a = await book(db, filteredClient, {
    serviceId: "signature",
    start: time(),
    note: "",
    requestKey: randomUUID(),
  });
  assert.ok(
    (await visits(db, filteredClient, false, 0, "", 1, "katie")).some(
      (v) => v.id === a.id,
    ),
  );
  assert.equal(
    (await visits(db, filteredClient, false, 0, "", 1, "second")).length,
    0,
  );
  assert.ok(
    !(await visits(db, client, false, 0, "", 1, "katie")).some(
      (v) => v.id === a.id,
    ),
  );
});
