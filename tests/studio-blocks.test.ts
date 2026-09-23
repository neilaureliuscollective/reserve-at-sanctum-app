import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { DateTime } from "luxon";
import { randomUUID } from "node:crypto";
import { schema, seed, wrapPglite, type Database } from "../lib/db";
import { type Actor, book, availability } from "../lib/booking";
import { blockTime, listBlocks, removeBlock } from "../lib/studio-blocks";
let pg: PGlite, db: Database;
const staff: Actor = {
  id: "preview-katie",
  name: "Katie",
  email: "katie@preview.invalid",
  role: "staff",
  provider_id: "katie",
};
const client: Actor = {
  id: "preview-client",
  name: "Jordan",
  email: "jordan@preview.invalid",
  role: "client",
  provider_id: null,
};
let day = DateTime.now()
  .setZone("America/Chicago")
  .plus({ days: 4 })
  .startOf("day");
while (![2, 3, 4, 5, 6].includes(day.weekday)) day = day.plus({ days: 1 });
const date = day.toISODate()!;
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
test("only Katie staff and owner can list, create or remove blocks", async () => {
  for (const actor of [client, { ...staff, provider_id: "other" }]) {
    await assert.rejects(listBlocks(db, actor), /access/);
    await assert.rejects(
      blockTime(db, actor, { date, start: "09:00", end: "10:00" }),
      /access/,
    );
    await assert.rejects(removeBlock(db, actor, randomUUID()), /access/);
  }
});
test("blocks remove availability and deletion restores it without touching visits", async () => {
  const initial = await availability(db, "signature", date);
  const id = await blockTime(db, staff, { date, start: "09:00", end: "10:00" });
  const after = await availability(db, "signature", date);
  assert.ok(after.length < initial.length);
  assert.ok((await listBlocks(db, staff)).some((x) => x.id === id));
  await removeBlock(db, staff, id);
  assert.deepEqual(await availability(db, "signature", date), initial);
});
test("block and simultaneous appointment have exactly one winner and no partial occupancy", async () => {
  const results = await Promise.allSettled([
    blockTime(db, staff, { date, start: "11:00", end: "12:00" }),
    book(db, client, {
      serviceId: "signature",
      start: day.set({ hour: 11 }).toUTC().toISO()!,
      note: "",
      requestKey: randomUUID(),
    }),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const rows = await db.query(
    "SELECT * FROM reserve_occupancy WHERE starts_at >= $1 AND starts_at < $2",
    [
      day.set({ hour: 11 }).toUTC().toISO(),
      day.set({ hour: 12 }).toUTC().toISO(),
    ],
  );
  assert.equal(rows.length, 4);
  await assert.rejects(
    blockTime(db, staff, { date, start: "10:30", end: "11:30" }),
    /overlaps/,
  );
  assert.equal(
    (
      await db.query("SELECT * FROM reserve_occupancy WHERE starts_at=$1", [
        day.set({ hour: 10, minute: 30 }).toUTC().toISO(),
      ])
    ).length,
    0,
  );
});
test("invalid and reversed intervals are rejected", async () => {
  for (const [start, end] of [
    ["10:01", "11:00"],
    ["12:00", "11:00"],
    ["10:00", "10:00"],
    ["99:00", "10:00"],
  ])
    await assert.rejects(blockTime(db, staff, { date, start, end }), /Choose/);
});
