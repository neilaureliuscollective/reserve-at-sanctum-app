import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { schema, seed, wrapPglite, type Database } from "../lib/db";
import type { Actor } from "../lib/booking";
import {
  readInterest,
  saveInterest,
  withdraw,
  overview,
  readSettings,
  saveSettings,
  savePartner,
  rate,
  cleanup,
} from "../lib/vitalis/store";
import { noticeVersion, partnerInput } from "../lib/vitalis/validation";
import { memberConcierge } from "../lib/member-concierge";
let pg: PGlite, db: Database;
const a: Actor = {
    id: "preview-client",
    role: "client",
    name: "Test",
    email: "test@preview.invalid",
    provider_id: null,
  },
  b = { ...a, id: "preview-other" },
  owner = { ...a, id: "preview-neil", role: "owner" as const },
  staff = { ...a, id: "preview-katie", role: "operator" as const };
const input = {
  interests: ["diagnostics"],
  region: "LA",
  outreach: false,
  collectionConsent: true,
  noticeVersion,
  revision: 0,
};
before(async () => {
  pg = new PGlite();
  await pg.waitReady;
  db = wrapPglite(pg);
  await schema(db);
  await seed(db);
});
after(async () => pg.close());
test("concurrent joins are idempotent; cannot opt another account in or manufacture consent on retry", async () => {
  const results = await Promise.all([
    saveInterest(db, a, input, true),
    saveInterest(db, a, { ...input, outreach: true }, true),
  ]);
  assert.equal(results[0]?.revision, 1);
  assert.equal(results[1]?.revision, 1);
  assert.equal(results[1]?.outreach, false);
  assert.equal(await readInterest(db, b), null);
  assert.equal(
    (
      await db.query(
        "SELECT * FROM reserve_vitalis_consent_events WHERE user_id=$1",
        [a.id],
      )
    ).length,
    1,
  );
  await assert.rejects(
    saveInterest(db, b, { ...input, user_id: a.id }),
    /Unrecognized key/,
  );
  await assert.rejects(saveInterest(db, staff, input), /customer accounts/);
  await assert.rejects(
    saveInterest(db, a, { ...input, collectionConsent: false }),
  );
  await assert.rejects(overview(db, staff), /Owner access/);
});
test("updates require revisions; permission has independent history; withdrawal clears preferences even when registration closed", async () => {
  let r: Awaited<ReturnType<typeof readInterest>> = await saveInterest(db, a, {
    ...input,
    outreach: true,
    revision: 1,
  });
  assert.equal(r?.revision, 2);
  await assert.rejects(
    saveInterest(db, a, { ...input, revision: 1 }),
    /changed/,
  );
  const attempts = await Promise.allSettled([
    saveInterest(db, a, {
      ...input,
      outreach: true,
      revision: 2,
      region: "TX",
    }),
    saveInterest(db, a, {
      ...input,
      outreach: true,
      revision: 2,
      region: "CA",
    }),
  ]);
  assert.equal(attempts.filter((x) => x.status === "fulfilled").length, 1);
  r = await readInterest(db, a);
  assert.equal(r?.revision, 3);
  await saveSettings(db, owner, {
    visible: false,
    registration_open: false,
    revision: 1,
  });
  await assert.rejects(saveInterest(db, b, input, true), /paused/);
  assert.ok(r);
  r = await saveInterest(db, a, {
    ...input,
    interests: r.interests,
    region: r.region,
    outreach: false,
    revision: 3,
  });
  assert.equal(r?.outreach, false);
  await assert.rejects(
    saveInterest(db, a, { ...input, outreach: true, revision: 4 }),
    /paused/,
  );
  r = await withdraw(db, a, 4);
  assert.equal(r?.status, "withdrawn");
  assert.deepEqual(r?.interests, []);
  assert.equal(r?.region, "");
  assert.equal(r?.outreach, false);
  const count = (
    await db.query(
      "SELECT * FROM reserve_vitalis_consent_events WHERE user_id=$1",
      [a.id],
    )
  ).length;
  await withdraw(db, a, 4);
  assert.equal(
    (
      await db.query(
        "SELECT * FROM reserve_vitalis_consent_events WHERE user_id=$1",
        [a.id],
      )
    ).length,
    count,
  );
  await saveSettings(db, owner, {
    visible: true,
    registration_open: true,
    revision: 2,
  });
  await assert.rejects(saveInterest(db, a, input, true), /changed/);
  r = await saveInterest(db, a, { ...input, revision: 5 }, true);
  assert.equal(r?.revision, 6);
  const office = await overview(db, owner);
  assert.equal(office.totals.active, 1);
  assert.equal(office.totals.contact_ready, 0);
});
test("rate admission is bounded and resets each minute", async () => {
  const results = await Promise.allSettled(
    Array.from({ length: 15 }, () => rate(db, a, 60000)),
  );
  assert.equal(results.filter((x) => x.status === "fulfilled").length, 12);
  await rate(db, a, 60000, "event");
  await assert.rejects(rate(db, a, 60000), /wait a minute/);
  await rate(db, a, 120000);
});
test("partner configuration remains owner-only, strict and revision protected; unsafe destinations rejected", async () => {
  const p = {
    id: "123e4567-e89b-42d3-a456-426614174000",
    name: "Synthetic partner",
    categories: ["diagnostics"],
    regions: ["LA"],
    status: "draft",
    kind: "clinical",
    destination: "https://example.org/clinic",
    destinationReviewed: true,
    revision: 0,
  };
  for (const destination of [
    "javascript:alert(1)",
    "http://example.org",
    "https://example.org?email=x",
    "https://example.org/#token",
    "https://a:b@example.org",
    "https://127.0.0.1/",
  ])
    assert.equal(partnerInput.safeParse({ ...p, destination }).success, false);
  assert.equal(
    partnerInput.safeParse({ ...p, destinationReviewed: false }).success,
    false,
  );
  await assert.rejects(savePartner(db, staff, p), /Owner access/);
  await savePartner(db, owner, p);
  await assert.rejects(savePartner(db, owner, p), /changed/);
  await savePartner(db, owner, { ...p, status: "verified", revision: 1 });
  const office = await overview(db, owner);
  assert.equal(office.partners[0].revision, 2);
  assert.equal(office.partners[0].status, "verified");
  await assert.rejects(
    saveSettings(db, staff, {
      visible: true,
      registration_open: true,
      revision: 3,
    }),
    /Owner access/,
  );
  await assert.rejects(
    saveSettings(db, owner, {
      visible: true,
      registration_open: true,
      revision: 1,
    }),
    /changed/,
  );
});
test("cleanup removes stale interest and inactive consent evidence without touching active records", async () => {
  await saveInterest(db, b, input, true);
  await db.query(
    "UPDATE reserve_vitalis_interests SET updated_at=now()-interval '13 months' WHERE user_id=$1",
    [b.id],
  );
  await db.query(
    "UPDATE reserve_vitalis_consent_events SET created_at=now()-interval '13 months' WHERE user_id=$1",
    [b.id],
  );
  await assert.rejects(cleanup(db, staff), /Owner access/);
  assert.equal(await cleanup(db, owner), 1);
  assert.equal(await readInterest(db, b), null);
  assert.equal(
    (
      await db.query(
        "SELECT * FROM reserve_vitalis_consent_events WHERE user_id=$1",
        [b.id],
      )
    ).length,
    0,
  );
  assert.equal((await readInterest(db, a))?.status, "active");
});
test("Vitalis concierge is factual navigation, does not read interest or dispatch AI", async () => {
  const r = await memberConcierge(
    db,
    a,
    { message: "Tell me about Vitalis" },
    async () => {
      throw Error("AI must not run");
    },
  );
  assert.equal(r.mode, "verified");
  assert.equal(r.links[0].href, "/vitalis");
  assert.match(r.text, /no clinical care/);
});
test("all nine Vitalis tables have RLS, no policies or PUBLIC grants", async () => {
  const rows = await db.query<{ relname: string; relrowsecurity: boolean }>(
    "SELECT relname,relrowsecurity FROM pg_class WHERE relname LIKE 'reserve_vitalis_%' AND relkind='r'",
  );
  assert.equal(rows.length, 9);
  assert.ok(rows.every((x) => x.relrowsecurity));
  assert.deepEqual(
    await db.query(
      "SELECT * FROM pg_policies WHERE tablename LIKE 'reserve_vitalis_%'",
    ),
    [],
  );
  assert.deepEqual(
    await db.query(
      "SELECT table_name FROM information_schema.table_privileges WHERE table_name LIKE 'reserve_vitalis_%' AND grantee='PUBLIC'",
    ),
    [],
  );
});
