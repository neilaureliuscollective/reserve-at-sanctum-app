import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { schema, seed, wrapPglite, type Database } from "../lib/db";
import type { Actor } from "../lib/booking";
import {
  journeyNotice,
  journeyInput,
  checkInput,
  pilotBoundary,
} from "../lib/vitalis/journey-design";
import {
  journeyCalendar,
  readJourney,
  saveJourney,
  checkJourney,
  clearJourney,
  journeyOverview,
} from "../lib/vitalis/journey-store";
import { launchInput, commercialBoundary } from "../lib/vitalis/launch-design";
import { launchOverview, saveLaunchReview } from "../lib/vitalis/launch-store";
import { saveRoutine, readRoutine } from "../lib/personal-reserve";
let pg: PGlite, db: Database;
const a: Actor = {
    id: "preview-client",
    role: "client",
    name: "Test",
    email: "test@preview.invalid",
    provider_id: null,
  },
  other = { ...a, id: "preview-other" },
  owner = { ...a, id: "preview-neil", role: "owner" as const },
  staff = { ...a, id: "preview-katie", role: "operator" as const };
const now = Date.parse("2026-10-08T16:00:00Z"),
  input = {
    direction: "sleep",
    minutes: 10,
    target: 3,
    revision: 0,
    adult: true,
    consent: true,
    noticeVersion: journeyNotice,
  };
before(async () => {
  pg = new PGlite();
  await pg.waitReady;
  db = wrapPglite(pg);
  await schema(db);
  await seed(db);
});
after(async () => pg.close());
test("Chicago calendar uses local days, Monday boundaries and DST", () => {
  assert.equal(
    journeyCalendar(Date.parse("2026-10-09T03:59:59Z")).today,
    "2026-10-08",
  );
  assert.equal(
    journeyCalendar(Date.parse("2026-10-09T05:00:00Z")).today,
    "2026-10-09",
  );
  assert.deepEqual(journeyCalendar(now).week, [
    "2026-10-05",
    "2026-10-06",
    "2026-10-07",
    "2026-10-08",
    "2026-10-09",
    "2026-10-10",
    "2026-10-11",
  ]);
  assert.equal(
    journeyCalendar(Date.parse("2026-11-01T07:30:00Z")).today,
    "2026-11-01",
  );
  assert.equal(
    journeyCalendar(Date.parse("2026-03-08T08:30:00Z")).today,
    "2026-03-08",
  );
  assert.throws(() => journeyCalendar(NaN));
});
test("pilot requires adulthood, versioned consent and bounded choices; no clinical or identity fields", () => {
  for (const patch of [
    { adult: false },
    { consent: false },
    { noticeVersion: "old" },
    { target: 0 },
    { target: 8 },
    { minutes: 60 },
    { direction: "trt" },
    { user_id: other.id },
    { diagnosis: "test" },
  ])
    assert.equal(journeyInput.safeParse({ ...input, ...patch }).success, false);
  assert.equal(
    checkInput.safeParse({ revision: 1, completed: true, date: "2027-01-01" })
      .success,
    false,
  );
  assert.deepEqual(pilotBoundary, {
    paid: false,
    clinical: false,
    discounts: false,
  });
});
test("member-only pilot and first-save races preserve account isolation", async () => {
  await assert.rejects(saveJourney(db, owner, input, now), /customer accounts/);
  await assert.rejects(readJourney(db, staff, now), /customer accounts/);
  const results = await Promise.allSettled([
    saveJourney(db, a, input, now),
    saveJourney(db, a, { ...input, direction: "movement" }, now),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const view = await readJourney(db, a, now);
  assert.equal(view.journey?.revision, 1);
  assert.equal(view.journey?.direction, "sleep");
  assert.equal((await readJourney(db, other, now)).journey, null);
  await assert.rejects(saveJourney(db, a, input, now), /changed/);
});
test("completion uses server day, can be undone, and stale simultaneous edits cannot erase newer state", async () => {
  const v = await checkJourney(db, a, { revision: 1, completed: true }, now);
  assert.deepEqual(v.journey?.days, ["2026-10-08"]);
  const r = await Promise.allSettled([
    checkJourney(db, a, { revision: 2, completed: true }, now),
    checkJourney(db, a, { revision: 2, completed: false }, now),
  ]);
  assert.equal(r.filter((x) => x.status === "fulfilled").length, 1);
  let current = await readJourney(db, a, now);
  assert.equal(current.journey?.revision, 3);
  assert.equal(
    new Set(current.journey?.days).size,
    current.journey?.days.length,
  );
  current = await checkJourney(db, a, { revision: 3, completed: false }, now);
  assert.deepEqual(current.journey?.days, []);
  await assert.rejects(
    checkJourney(db, other, { revision: 1, completed: true }, now),
    /Save a rhythm/,
  );
});
test("direction changes reset history but do not overwrite the canonical Reserve routine", async () => {
  await saveRoutine(db, a, {
    priority: "performance",
    title: "Keep my training",
    steps: ["My existing step"],
    revision: 0,
  });
  let v = await checkJourney(db, a, { revision: 4, completed: true }, now);
  v = await saveJourney(
    db,
    a,
    { ...input, revision: v.journey!.revision, target: 5 },
    now,
  );
  assert.deepEqual(v.journey?.days, ["2026-10-08"]);
  v = await saveJourney(
    db,
    a,
    { ...input, revision: v.journey!.revision, direction: "meal-planning" },
    now,
  );
  assert.deepEqual(v.journey?.days, []);
  assert.equal((await readRoutine(db, a))?.title, "Keep my training");
  assert.equal(
    (await journeyOverview(db, a, now)).routine?.priority,
    "performance",
  );
});
test("old completion dates are filtered and pruned; clear removes choices/consent with revision protection", async () => {
  await db.query(
    "UPDATE reserve_vitalis_journeys SET days=$2::jsonb WHERE user_id=$1",
    [a.id, JSON.stringify(["2026-01-01", "2026-10-08", "2027-01-01"])],
  );
  let v = await readJourney(db, a, now);
  assert.deepEqual(v.journey?.days, ["2026-10-08"]);
  v = await checkJourney(
    db,
    a,
    { revision: v.journey!.revision, completed: true },
    now,
  );
  const raw = await db.query(
    "SELECT days FROM reserve_vitalis_journeys WHERE user_id=$1",
    [a.id],
  );
  assert.deepEqual(raw[0].days, ["2026-10-08"]);
  const rev = v.journey!.revision;
  v = await clearJourney(db, a, { revision: rev }, now);
  assert.equal(v.journey?.active, false);
  assert.equal(v.journey?.direction, null);
  assert.deepEqual(v.journey?.days, []);
  const cleared = await db.query(
    "SELECT notice_version,consented_at FROM reserve_vitalis_journeys WHERE user_id=$1",
    [a.id],
  );
  assert.equal(cleared[0].notice_version, "");
  assert.equal(cleared[0].consented_at, null);
  await assert.rejects(
    saveJourney(db, a, { ...input, revision: rev }, now),
    /changed/,
  );
  await assert.rejects(
    checkJourney(db, a, { revision: rev + 1, completed: true }, now),
    /Save a rhythm/,
  );
  await saveJourney(
    db,
    a,
    { ...input, revision: rev + 1, direction: "movement" },
    now,
  );
  assert.equal((await readRoutine(db, a))?.title, "Keep my training");
});
test("launch evidence rejects unsafe references and unknown gates; recorded review needs reference", () => {
  const valid = {
    key: "offer",
    reviewed: true,
    reference: "docs/approved-offer.md",
    revision: 0,
  };
  assert.equal(launchInput.safeParse(valid).success, true);
  for (const patch of [
    { reference: "" },
    { reference: "javascript:alert(1)" },
    { reference: "https://example.org?token=secret" },
    { reference: "docs/../secret.pdf" },
    { key: "activate" },
    { clinicalData: "test" },
    { revision: -1 },
  ])
    assert.equal(launchInput.safeParse({ ...valid, ...patch }).success, false);
  assert.deepEqual(commercialBoundary, {
    canCharge: false,
    canEnrollClinical: false,
    canGrantDiscount: false,
  });
});
test("launch reviews are owner-only, revision protected and contain only aggregate participation", async () => {
  for (const actor of [a, staff]) {
    await assert.rejects(launchOverview(db, actor), /Owner access/);
    await assert.rejects(
      saveLaunchReview(db, actor, {
        key: "offer",
        reviewed: false,
        reference: "",
        revision: 0,
      }),
      /Owner access/,
    );
  }
  let overview = await launchOverview(db, owner);
  assert.equal(overview.gates.length, 9);
  assert.equal(overview.gates.filter((g) => g.reviewed).length, 0);
  assert.equal(overview.pilot.active, 1);
  assert.equal(JSON.stringify(overview).includes(a.id), false);
  assert.equal(JSON.stringify(overview).includes("movement"), false);
  assert.equal(JSON.stringify(overview).includes("days"), false);
  const i = {
    key: "offer",
    reviewed: true,
    reference: "docs/approved-offer.md",
    revision: 0,
  };
  const race = await Promise.allSettled([
    saveLaunchReview(db, owner, i),
    saveLaunchReview(db, owner, i),
  ]);
  assert.equal(race.filter((r) => r.status === "fulfilled").length, 1);
  await assert.rejects(saveLaunchReview(db, owner, i), /changed/);
  await saveLaunchReview(db, owner, {
    ...i,
    revision: 1,
    reviewed: false,
    reference: "",
  });
  overview = await launchOverview(db, owner);
  assert.equal(overview.gates[0].revision, 2);
  assert.equal(overview.gates[0].reviewed, false);
  assert.deepEqual(overview.boundary, commercialBoundary);
});
