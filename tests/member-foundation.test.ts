import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import { PGlite } from "@electric-sql/pglite";
import { schema, seed, wrapPglite, type Database } from "../lib/db";
import {
  book,
  catalog,
  availability,
  change,
  type Actor,
} from "../lib/booking";
import { membershipState, readMembership } from "../lib/membership";
import { memberSummary, memberRead } from "../lib/experience/member";
const actor: Actor = {
  id: "preview-client",
  name: "Jordan",
  email: "jordan@preview.invalid",
  role: "client",
  provider_id: null,
};
let pg: PGlite, db: Database;
before(async () => {
  pg = new PGlite();
  await pg.waitReady;
  db = wrapPglite(pg);
  await schema(db);
  await seed(db);
  await db.query(
    `INSERT INTO reserve_locations(id,name,short_name,city,region,timezone,enabled,booking_enabled,status) VALUES('second','Second','Second','Second','Test','America/Chicago',true,true,'operating'),('closed','Closed','Closed','Closed','Test','America/Chicago',false,false,'planned')`,
  );
  await db.query(
    "INSERT INTO reserve_provider_locations(provider_id,location_id) VALUES('katie','second')",
  );
});
after(async () => pg.close());
function input() {
  let day = DateTime.now()
    .setZone("America/Chicago")
    .plus({ days: 12 })
    .startOf("day");
  while (![2, 3, 4, 5, 6].includes(day.weekday)) day = day.plus({ days: 1 });
  return {
    serviceId: "signature",
    start: day.set({ hour: 11 }).toUTC().toISO()!,
    requestKey: randomUUID(),
    note: "",
  };
}
test("location-bound catalog does not fall back on database failure", async () => {
  await assert.rejects(
    catalog(
      {
        query: async () => {
          throw new Error("read failed");
        },
      },
      "eunice",
    ),
    /read failed/,
  );
  assert.deepEqual(await catalog(db, "closed"), []);
  assert.deepEqual(await catalog(db, "unknown"), []);
  await db.query(
    "DELETE FROM reserve_provider_locations WHERE provider_id='katie' AND location_id='second'",
  );
  assert.deepEqual(await catalog(db, "second"), []);
  await db.query(
    "INSERT INTO reserve_provider_locations(provider_id,location_id) VALUES('katie','second')",
  );
});
test("direct bookings and availability reject closed, unknown and unassigned locations", async () => {
  for (const locationId of ["closed", "unknown"]) {
    await assert.rejects(
      book(db, actor, { ...input(), locationId }),
      /not accepting/,
    );
    await assert.rejects(
      availability(db, "signature", "2026-10-20", undefined, locationId),
      /not accepting/,
    );
  }
  await db.query(
    "DELETE FROM reserve_provider_locations WHERE provider_id='katie' AND location_id='second'",
  );
  await assert.rejects(
    book(db, actor, { ...input(), locationId: "second" }),
    /not offered/,
  );
  await db.query(
    "INSERT INTO reserve_provider_locations(provider_id,location_id) VALUES('katie','second')",
  );
});
test("one provider cannot be booked simultaneously across houses; location participates in retry identity", async () => {
  const i = input();
  const results = await Promise.allSettled([
    book(db, actor, { ...i, locationId: "eunice" }),
    book(
      db,
      { ...actor, id: "preview-other" },
      { ...i, requestKey: randomUUID(), locationId: "second" },
    ),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const winner = results.find(
    (r) => r.status === "fulfilled",
  ) as PromiseFulfilledResult<Awaited<ReturnType<typeof book>>>;
  assert.ok(["eunice", "second"].includes(winner.value.location_id!));
  const owner = { ...actor, id: winner.value.client_id };
  const same = {
    ...i,
    requestKey: winner.value.request_key as string,
    locationId: winner.value.location_id!,
  };
  assert.equal((await book(db, owner, same)).id, winner.value.id);
  await assert.rejects(
    book(db, owner, {
      ...same,
      locationId: same.locationId === "eunice" ? "second" : "eunice",
    }),
    /already used/,
  );
  await change(db, owner, winner.value.id, { action: "cancel", revision: 1 });
});
test("membership effective dates and explicit status remain truthful", () => {
  const base = {
    id: "m",
    user_id: actor.id,
    plan_id: "house",
    location_id: "eunice",
    status: "active" as const,
    starts_at: null,
    ends_at: null,
    revision: 1,
    access_basis: "legacy" as const,
    plan_snapshot: null,
  };
  const now = new Date("2026-10-07");
  assert.equal(membershipState(null, now), "none");
  assert.equal(membershipState(base, now), "active");
  assert.equal(
    membershipState({ ...base, starts_at: "2026-11-01" }, now),
    "pending",
  );
  assert.equal(
    membershipState({ ...base, ends_at: "2026-10-01" }, now),
    "ended",
  );
  for (const status of ["pending", "paused", "ended"] as const)
    assert.equal(membershipState({ ...base, status }, now), status);
});
test("membership ownership and unavailable reads do not manufacture absence", async () => {
  await db.query(
    "INSERT INTO reserve_memberships(id,user_id,plan_id,status) VALUES('member-jordan','preview-client','house','active')",
  );
  assert.equal((await readMembership(db, actor))?.id, "member-jordan");
  assert.equal(
    await readMembership(db, { ...actor, id: "preview-other" }),
    null,
  );
  const result = await memberRead(() =>
    readMembership(
      {
        query: async () => {
          throw new Error("offline");
        },
      },
      actor,
    ),
  );
  assert.equal(result.state, "unavailable");
});
test("preferred house is separate from visit location and sensitive Chair information", async () => {
  await db.query(
    "UPDATE reserve_users SET preferred_location_id='second' WHERE id=$1",
    [actor.id],
  );
  const summary = await memberSummary(db, actor);
  assert.equal(summary.houses.data?.house?.id, "second");
  assert.equal(JSON.stringify(summary).includes("share_with_katie"), false);
  assert.equal(JSON.stringify(summary).includes("service_note"), false);
  await db.query(
    "UPDATE reserve_locations SET enabled=false WHERE id='second'",
  );
  assert.equal(
    (await memberSummary(db, actor)).houses.data?.house?.id,
    "eunice",
  );
});
test("legacy organizational location schema reconciles without publishing or enabling setup", async () => {
  const old = new PGlite();
  await old.waitReady;
  const legacy = wrapPglite(old);
  try {
    await old.exec(
      "CREATE TABLE reserve_organizations(id text PRIMARY KEY,name text NOT NULL); INSERT INTO reserve_organizations VALUES('legacy-reserve','Legacy Reserve'); CREATE TABLE reserve_locations(id text PRIMARY KEY,organization_id text NOT NULL REFERENCES reserve_organizations(id),name text NOT NULL,slug text NOT NULL,timezone text NOT NULL DEFAULT 'America/Chicago',state text NOT NULL DEFAULT 'setup',address text,published boolean NOT NULL DEFAULT false); INSERT INTO reserve_locations(id,organization_id,name,slug) VALUES('eunice','legacy-reserve','Legacy Reserve — Eunice','eunice');",
    );
    await schema(legacy);
    await schema(legacy);
    const [house] = await legacy.query(
      "SELECT * FROM reserve_locations WHERE id='eunice'",
    );
    assert.equal(house.state, "setup");
    assert.equal(house.published, false);
    assert.equal(house.enabled, false);
    assert.equal(house.booking_enabled, false);
    assert.deepEqual(await catalog(legacy, "eunice"), []);
  } finally {
    await old.close();
  }
});
