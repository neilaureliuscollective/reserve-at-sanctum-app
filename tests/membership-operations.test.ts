import { before, beforeEach, after, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { schema, seed, wrapPglite, type Database } from "../lib/db";
import type { Actor } from "../lib/booking";
import {
  listMembershipPlans,
  readMembership,
  membershipState,
} from "../lib/membership";
import {
  savePlan,
  grantMembership,
  changeMembership,
  requestMembership,
  closeRequest,
  memberRequest,
  membershipOperations,
  membershipPrivileges,
  privilegeSchema,
} from "../lib/membership-operations";
const owner: Actor = {
  id: "preview-neil",
  name: "Neil",
  email: "neil@preview.invalid",
  role: "owner",
  provider_id: null,
};
const member: Actor = {
  id: "preview-client",
  name: "Jordan",
  email: "jordan@preview.invalid",
  role: "client",
  provider_id: null,
};
const other: Actor = {
  ...member,
  id: "preview-other",
  email: "morgan@preview.invalid",
};
const operator: Actor = {
  ...owner,
  id: "preview-katie",
  role: "operator",
  provider_id: "katie",
};
let pg: PGlite, db: Database;
const privileges = [
  {
    kind: "digital_access" as const,
    label: "Personal profile and visit preferences",
    availability: "available" as const,
    destination: "profile" as const,
  },
  {
    kind: "location_eligibility" as const,
    label: "Your assigned house",
    availability: "available" as const,
    destination: "book" as const,
  },
  {
    kind: "product_discount" as const,
    label: "Product pricing in preparation",
    availability: "planned" as const,
    destination: "collection" as const,
  },
];
before(async () => {
  pg = new PGlite();
  await pg.waitReady;
  db = wrapPglite(pg);
  await schema(db);
  await seed(db);
});
beforeEach(async () => {
  await db.query("DELETE FROM reserve_membership_events");
  await db.query("DELETE FROM reserve_membership_requests");
  await db.query("DELETE FROM reserve_memberships");
  await db.query(
    "UPDATE reserve_membership_plans SET active=false,revision=1 WHERE id IN ('house','circle','private')",
  );
  await db.query(
    "UPDATE reserve_locations SET enabled=true,booking_enabled=true WHERE id='eunice'",
  );
});
after(async () => pg.close());
async function publish(id = "house") {
  await savePlan(db, owner, {
    id,
    revision: 1,
    name: "House membership",
    tagline: "An ongoing relationship",
    active: true,
    benefit_model: privileges,
  });
}
function grant(
  email = member.email,
  planId = "house",
  locationId: string | null = "eunice",
) {
  return {
    email,
    planId,
    planRevision: 2,
    locationId,
    startsAt: new Date(Date.now() - 86400000).toISOString(),
    endsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    acknowledge: true,
  };
}
test("only owner can read operations, publish, grant or change access; capability claims do not elevate staff", async () => {
  for (const a of [
    member,
    operator,
    {
      ...operator,
      capability_overrides: [
        {
          capability: "users.admin",
          decision: "allow" as const,
          scope: "company" as const,
        },
      ],
    },
  ]) {
    await assert.rejects(membershipOperations(db, a), /owner/);
    await assert.rejects(savePlan(db, a, {}), /owner/);
    await assert.rejects(grantMembership(db, a, {}), /owner/);
    await assert.rejects(changeMembership(db, a, {}), /owner/);
  }
});
test("requests are owned, duplicate submissions are idempotent, withdrawal can resubmit, closing is revision guarded", async () => {
  const r = await requestMembership(db, member, { interest: "products" });
  const duplicate = await requestMembership(db, member, {
    interest: "services",
  });
  assert.equal(r.id, duplicate.id);
  assert.equal(duplicate.interest, "products");
  assert.equal(await memberRequest(db, other), null);
  await assert.rejects(
    closeRequest(db, other, r.id, r.revision, true),
    /not found/,
  );
  await closeRequest(db, member, r.id, r.revision, true);
  await assert.rejects(
    closeRequest(db, member, r.id, r.revision, true),
    /changed/,
  );
  const again = await requestMembership(db, member, { interest: "services" });
  assert.equal(again.revision, 3);
  await closeRequest(db, owner, again.id, again.revision);
  await assert.rejects(
    requestMembership(db, member, { interest: "membership" }),
    /reviewed/,
  );
});
test("plan publication validates real supported privileges and optimistic revision", async () => {
  for (const kind of ["credits", "product_discount", "service_benefit"])
    assert.equal(
      privilegeSchema.safeParse({
        kind,
        label: "Approved benefit",
        availability: "available",
        destination: "none",
      }).success,
      false,
    );
  await assert.rejects(
    savePlan(db, owner, {
      id: "house",
      revision: 1,
      name: "House",
      tagline: "",
      active: true,
      benefit_model: [{ ...privileges[0], availability: "planned" }],
    }),
  );
  await publish();
  await assert.rejects(publish(), /changed/);
  const [p] = await listMembershipPlans(db);
  assert.equal(p.revision, 2);
  assert.equal(p.benefit_model[0].availability, "available");
});
test("grant validates verified member, plan revision, acknowledgment and operating house without modifying booking", async () => {
  await assert.rejects(grantMembership(db, owner, grant()), /Publish/);
  await publish();
  await assert.rejects(
    grantMembership(db, owner, { ...grant(), email: owner.email }),
    /No member/,
  );
  await db.query(
    "INSERT INTO reserve_users(id,name,email,role) VALUES('preview-case','Case duplicate','JORDAN@PREVIEW.INVALID','client')",
  );
  try {
    await assert.rejects(
      grantMembership(db, owner, grant()),
      /More than one account/,
    );
  } finally {
    await db.query("DELETE FROM reserve_users WHERE id='preview-case'");
  }
  await assert.rejects(
    grantMembership(db, owner, { ...grant(), planRevision: 1 }),
    /changed/,
  );
  await assert.rejects(
    grantMembership(db, owner, { ...grant(), acknowledge: false }),
  );
  await db.query(
    "UPDATE reserve_locations SET enabled=false,booking_enabled=false WHERE id='eunice'",
  );
  await assert.rejects(grantMembership(db, owner, grant()), /operating house/);
  const m = await grantMembership(
    db,
    owner,
    grant(member.email, "house", null),
  );
  assert.equal(m.access_basis, "complimentary");
  const [house] = await db.query(
    "SELECT enabled,booking_enabled FROM reserve_locations WHERE id='eunice'",
  );
  assert.equal(house.enabled, false);
  assert.equal(house.booking_enabled, false);
  assert.equal(
    (await db.query("SELECT count(*)::int AS n FROM reserve_appointments"))[0]
      .n,
    0,
  );
});
test("simultaneous grants to different plans serialize by member, with a single current membership", async () => {
  await publish();
  await publish("circle");
  const results = await Promise.allSettled([
    grantMembership(db, owner, grant()),
    grantMembership(db, owner, grant(member.email, "circle")),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int AS n FROM reserve_memberships WHERE user_id=$1",
        [member.id],
      )
    )[0].n,
    1,
  );
});
test("grant fulfills request atomically and snapshots survive future plan changes or unpublishing", async () => {
  const request = await requestMembership(db, member, {
    interest: "membership",
  });
  await publish();
  const m = await grantMembership(db, owner, grant());
  assert.equal((await memberRequest(db, member))?.status, "fulfilled");
  await savePlan(db, owner, {
    id: "house",
    revision: 2,
    name: "A future name",
    tagline: "New",
    active: false,
    benefit_model: [{ ...privileges[0], label: "Future benefit" }],
  });
  const saved = await readMembership(db, member);
  assert.equal(saved?.plan_name, "House membership");
  assert.deepEqual(saved?.plan_snapshot?.privileges, privileges);
  assert.equal(
    membershipPrivileges(saved!, undefined, true, true)[0].href,
    "/profile",
  );
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int AS n FROM reserve_membership_events WHERE subject_id=$1",
        [request.id],
      )
    )[0].n,
    2,
  );
  assert.equal(
    (
      await db.query(
        "SELECT detail FROM reserve_membership_events WHERE subject_id=$1 AND event='membership.granted'",
        [m.id],
      )
    )[0].detail instanceof Object,
    true,
  );
});
test("paused, future, expired, ended and closed-house access never produces actionable privileges", async () => {
  await publish();
  const m = await grantMembership(db, owner, grant());
  assert.equal(
    membershipPrivileges(m, undefined, true, true)[1].href,
    "/book?location=eunice",
  );
  assert.equal(
    membershipPrivileges(m, undefined, true, false)[1].state,
    "house_unavailable",
  );
  assert.equal(membershipPrivileges(m, undefined, false, true)[1].href, null);
  assert.equal(
    membershipPrivileges(m, undefined, false, false)[0].href,
    "/profile",
  );
  for (const candidate of [
    { ...m, status: "paused" as const },
    { ...m, status: "ended" as const },
    { ...m, starts_at: new Date(Date.now() + 86400000) },
    { ...m, ends_at: new Date(Date.now() - 86400000) },
  ])
    assert.ok(
      membershipPrivileges(candidate, undefined, true, true).every(
        (b) => b.href === null,
      ),
    );
  assert.equal(
    membershipPrivileges(m, undefined, true, true)[2].state,
    "planned",
  );
});
test("lifecycle uses revisions, rejects stale updates and preserves an immutable audit of actions", async () => {
  await publish();
  const m = await grantMembership(db, owner, grant());
  await changeMembership(db, owner, {
    id: m.id,
    revision: m.revision,
    action: "pause",
  });
  await assert.rejects(
    changeMembership(db, owner, {
      id: m.id,
      revision: m.revision,
      action: "resume",
    }),
    /changed/,
  );
  await changeMembership(db, owner, {
    id: m.id,
    revision: 2,
    action: "resume",
  });
  await changeMembership(db, owner, { id: m.id, revision: 3, action: "end" });
  const saved = await readMembership(db, member);
  assert.equal(saved?.status, "ended");
  assert.equal(saved?.revision, 4);
  await assert.rejects(
    changeMembership(db, owner, { id: m.id, revision: 4, action: "resume" }),
    /not available/,
  );
  const events = await db.query(
    "SELECT event FROM reserve_membership_events WHERE subject_id=$1 ORDER BY created_at",
    [m.id],
  );
  assert.deepEqual(
    events.map((e) => e.event),
    [
      "membership.granted",
      "membership.pause",
      "membership.resume",
      "membership.end",
    ],
  );
});
test("expired access does not overshadow a current membership; legacy descriptors never silently gain live privileges", async () => {
  await publish();
  const m = await grantMembership(db, owner, grant());
  await db.query(
    "INSERT INTO reserve_memberships(id,user_id,plan_id,status,ends_at) VALUES('expired', $1,'circle','active',now()-interval '1 day')",
    [member.id],
  );
  assert.equal((await readMembership(db, member))?.id, m.id);
  const p = (await listMembershipPlans(db))[0];
  assert.ok(
    membershipPrivileges({ ...m, plan_snapshot: null }, p, true, true).every(
      (b) => b.state === "planned" && b.href === null,
    ),
  );
  assert.equal(await readMembership(db, other), null);
});
test("future complimentary access remains pending and cannot be resumed after expiration", async () => {
  await publish();
  const g = grant();
  const m = await grantMembership(db, owner, {
    ...g,
    startsAt: new Date(Date.now() + 86400000).toISOString(),
  });
  assert.equal(membershipState(m), "pending");
  await changeMembership(db, owner, { id: m.id, revision: 1, action: "pause" });
  await db.query(
    "UPDATE reserve_memberships SET ends_at=now()-interval '1 day' WHERE id=$1",
    [m.id],
  );
  await assert.rejects(
    changeMembership(db, owner, { id: m.id, revision: 2, action: "resume" }),
    /not available/,
  );
});
