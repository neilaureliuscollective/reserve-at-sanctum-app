import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { DateTime } from "luxon";
import { schema, seed, wrapPglite, type Database } from "../lib/db";
import { book, change, catalog, type Actor } from "../lib/booking";
import {
  operationOverview,
  proposeOperation,
  applyOperation,
  dismissOperation,
  operationInput,
} from "../lib/studio-operations";
let pg: PGlite, db: Database;
const owner: Actor = {
  id: "preview-neil",
  name: "Neil",
  email: "neil@preview.invalid",
  role: "owner",
  provider_id: null,
};
const operator: Actor = {
  id: "preview-katie",
  name: "Katie",
  email: "katie@preview.invalid",
  role: "operator",
  provider_id: "katie",
};
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
  await schema(db);
});
after(async () => pg.close());
const service = (revision = 0) => ({
  kind: "service",
  provider_id: "katie",
  target_revision: revision,
  name: "Test service",
  description: "Synthetic approved test",
  minutes: 45,
  buffer: 15,
  price: 5500,
  enabled: false,
});
test("provider-scoped proposals do not change the public catalog until owner applies", async () => {
  const proposal = await proposeOperation(db, operator, service());
  assert.ok(proposal.service_id);
  assert.ok(!(await catalog(db)).some((s) => s.id === proposal.service_id));
  await assert.rejects(applyOperation(db, operator, proposal.id), /permission/);
  await assert.rejects(proposeOperation(db, client, service()));
  await assert.rejects(
    proposeOperation(db, { ...operator, provider_id: "other" }, service()),
  );
  await assert.rejects(
    proposeOperation(
      db,
      {
        ...operator,
        capability_overrides: [
          { capability: "workspace.create", decision: "deny", scope: "shared" },
        ],
      },
      service(),
    ),
  );
  await applyOperation(db, owner, proposal.id);
  const [saved] = await db.query("SELECT * FROM reserve_services WHERE id=$1", [
    proposal.service_id,
  ]);
  assert.equal(saved.price, 5500);
  assert.equal(saved.enabled, false);
  assert.equal((await applyOperation(db, owner, proposal.id)).state, "applied");
});
test("competing setting proposals use revision checks; old proposals can be dismissed", async () => {
  const current = (await operationOverview(db, owner)).services.find(
    (s) => s.id === "signature",
  )!;
  const input = {
    ...service(current.revision),
    service_id: current.id,
    enabled: true,
  };
  const a = await proposeOperation(db, operator, { ...input, price: 5000 }),
    b = await proposeOperation(db, operator, { ...input, price: 6000 });
  const results = await Promise.allSettled([
    applyOperation(db, owner, a.id),
    applyOperation(db, owner, b.id),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const stale = results[0].status === "rejected" ? a : b;
  await dismissOperation(db, operator, stale.id);
  assert.ok(
    !(await operationOverview(db, owner)).proposals.some(
      (p) => p.id === stale.id,
    ),
  );
});
test("new provider starts closed; empty menu cannot be opened; bad hours and service durations fail", async () => {
  const input = {
    kind: "provider",
    provider_id: "new-provider",
    target_revision: 0,
    name: "Synthetic Provider",
    open_hour: 9,
    close_hour: 17,
    weekdays: [1, 2, 3],
    enabled: false,
  };
  const p = await proposeOperation(db, owner, input);
  await applyOperation(db, owner, p.id);
  const [provider] = await db.query(
    "SELECT * FROM reserve_providers WHERE id='new-provider'",
  );
  assert.equal(provider.enabled, false);
  const enable = await proposeOperation(db, owner, {
    ...input,
    target_revision: 1,
    enabled: true,
  });
  await assert.rejects(
    applyOperation(db, owner, enable.id),
    /approved service/,
  );
  assert.throws(() => operationInput.parse({ ...input, weekdays: [1, 1] }));
  assert.throws(() => operationInput.parse({ ...input, close_hour: 8 }));
  assert.throws(() => operationInput.parse({ ...service(), minutes: 17 }));
  assert.ok(
    !(await operationOverview(db, operator)).providers.some(
      (p) => p.id === "new-provider",
    ),
  );
});
test("settings changes preserve existing visits and require an impact acknowledgment", async () => {
  let day = DateTime.now()
    .setZone("America/Chicago")
    .startOf("day")
    .plus({ days: 1 });
  while (![2, 3, 4, 5, 6].includes(day.weekday)) day = day.plus({ days: 1 });
  const visit = await book(db, client, {
    serviceId: "signature",
    start: day.set({ hour: 10 }).toUTC().toISO()!,
    note: "",
    requestKey: randomUUID(),
  });
  const current = (await operationOverview(db, owner)).services.find(
    (s) => s.id === "signature",
  )!;
  const p = await proposeOperation(db, operator, {
    ...service(current.revision),
    service_id: current.id,
    enabled: true,
    price: 6500,
    minutes: 60,
  });
  await assert.rejects(applyOperation(db, owner, p.id), /existing visits/);
  await applyOperation(db, owner, p.id, true);
  const [saved] = await db.query(
    "SELECT * FROM reserve_appointments WHERE id=$1",
    [visit.id],
  );
  assert.equal(saved.price, visit.price);
  assert.equal(
    new Date(saved.ends_at as string).toISOString(),
    new Date(visit.ends_at).toISOString(),
  );
  const next = await book(db, client, {
    serviceId: "signature",
    start: day.set({ hour: 13 }).toUTC().toISO()!,
    note: "",
    requestKey: randomUUID(),
  });
  assert.equal(next.price, 6500);
  assert.equal(
    (new Date(next.ends_at).getTime() - new Date(next.starts_at).getTime()) /
      60000,
    60,
  );
});
test("completion belongs to the team, cannot precede the end, and is revision-bound", async () => {
  const visit = (
    await db.query<{ id: string; revision: number }>(
      "SELECT id,revision FROM reserve_appointments ORDER BY starts_at LIMIT 1",
    )
  )[0];
  await assert.rejects(
    change(db, client, visit.id, {
      action: "complete",
      revision: visit.revision,
    }),
  );
  await assert.rejects(
    change(db, operator, visit.id, {
      action: "complete",
      revision: visit.revision,
    }),
    /scheduled end/,
  );
  await db.query(
    "UPDATE reserve_appointments SET starts_at=now()-interval '2 hours',ends_at=now()-interval '1 hour',busy_until=now()-interval '45 minutes' WHERE id=$1",
    [visit.id],
  );
  await assert.rejects(
    change(db, { ...operator, provider_id: "other" }, visit.id, {
      action: "complete",
      revision: visit.revision,
    }),
  );
  const done = await change(db, operator, visit.id, {
    action: "complete",
    revision: visit.revision,
  });
  assert.equal(done.status, "completed");
  assert.equal(done.revision, visit.revision + 1);
  await assert.rejects(
    change(db, operator, visit.id, {
      action: "complete",
      revision: visit.revision,
    }),
  );
  assert.equal(
    (
      await db.query(
        "SELECT * FROM reserve_audit WHERE appointment_id=$1 AND action='completed'",
        [visit.id],
      )
    ).length,
    1,
  );
});
test("narrowing hours reports conflicts and preserves booked appointments", async () => {
  const current = (await operationOverview(db, owner)).providers.find(
    (p) => p.id === "katie",
  )!;
  const p = await proposeOperation(db, operator, {
    kind: "provider",
    provider_id: "katie",
    target_revision: current.revision,
    name: current.name,
    open_hour: 14,
    close_hour: 17,
    weekdays: current.weekdays,
    enabled: true,
  });
  const view = await operationOverview(db, operator);
  assert.ok(view.proposals.find((q) => q.id === p.id)!.affected_visits! > 0);
  await assert.rejects(applyOperation(db, owner, p.id), /existing visits/);
  const before = await db.query(
    "SELECT id,starts_at,price,status FROM reserve_appointments ORDER BY id",
  );
  await applyOperation(db, owner, p.id, true);
  assert.deepEqual(
    await db.query(
      "SELECT id,starts_at,price,status FROM reserve_appointments ORDER BY id",
    ),
    before,
  );
});
test("competing new provider proposals cannot overwrite the first approved setup", async () => {
  const input = {
    kind: "provider",
    provider_id: "competing-provider",
    target_revision: 0,
    name: "First",
    open_hour: 9,
    close_hour: 17,
    weekdays: [2],
    enabled: false,
  };
  const a = await proposeOperation(db, owner, input),
    b = await proposeOperation(db, owner, { ...input, name: "Second" });
  const results = await Promise.allSettled([
    applyOperation(db, owner, a.id),
    applyOperation(db, owner, b.id),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const [provider] = await db.query(
    "SELECT revision FROM reserve_providers WHERE id='competing-provider'",
  );
  assert.equal(provider.revision, 1);
});
