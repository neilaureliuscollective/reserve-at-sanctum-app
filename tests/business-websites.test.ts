import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { schema, seed, wrapPglite, type Database } from "../lib/db";
import { katieProfile } from "../lib/provider-brand-display";
import { grantBusiness, revokeBusiness } from "../lib/business-connections";
import {
  defaultFixItCopy,
  proposeWebsite,
  reviewWebsite,
  websiteSource,
  publishedFixItCopy,
  websiteProposal,
} from "../lib/business-websites";
import type { Actor } from "../lib/booking";
let pg: PGlite, db: Database;
const owner: Actor = {
  id: "preview-neil",
  name: "Synthetic owner",
  email: "owner@preview.invalid",
  role: "owner",
  provider_id: null,
};
const actor: Actor = {
  id: "preview-katie",
  name: "Synthetic Katie",
  email: "katie@preview.invalid",
  role: "operator",
  provider_id: "katie",
};
before(async () => {
  process.env.RESERVE_BUSINESS_WEBSITES_ENABLED = "true";
  pg = new PGlite();
  await pg.waitReady;
  db = wrapPglite(pg);
  await schema(db);
  await seed(db);
  await db.query(
    "INSERT INTO reserve_provider_brands(provider_id,slug,draft,published,published_revision,updated_by) VALUES('katie','fix-it-shop',$1::jsonb,$1::jsonb,1,'preview-neil') ON CONFLICT DO NOTHING",
    [
      JSON.stringify({
        ...katieProfile,
        headline: defaultFixItCopy.headline,
        bio: defaultFixItCopy.about,
      }),
    ],
  );
  await db.query(
    "INSERT INTO reserve_business_websites(id,provider_id,path) VALUES('fix-it-shop','katie','/fix-it-shop')",
  );
});
after(async () => {
  await pg.close();
  delete process.env.RESERVE_BUSINESS_WEBSITES_ENABLED;
});
test("website proposals need explicit consent and cannot publish or change unlisted fields", async () => {
  const grant = await grantBusiness(
    db,
    actor,
    "katie",
    "client",
    "C".repeat(43),
    false,
  );
  await assert.rejects(websiteSource(db, actor, grant), /Website permission/);
  const full = await grantBusiness(
    db,
    actor,
    "katie",
    "client",
    "D".repeat(43),
    true,
  );
  const source = await websiteSource(db, actor, full);
  const input = {
    requestId: randomUUID(),
    websiteId: "fix-it-shop",
    baseRevision: source.revision,
    content: {
      headline: "Synthetic revised introduction",
      about: "Synthetic revised biography for a test.",
    },
    serviceChanges: [
      {
        id: "signature",
        baseRevision: 1,
        description: "Synthetic approved service wording.",
      },
    ],
  };
  for (const extra of [
    { publish: true },
    { html: "<script>" },
    { providerId: "other" },
  ])
    assert.equal(
      websiteProposal.safeParse({ ...input, ...extra }).success,
      false,
    );
  const saved = await proposeWebsite(db, actor, full, input);
  assert.equal(saved.state, "review");
  assert.deepEqual(await proposeWebsite(db, actor, full, input), saved);
  await assert.rejects(
    proposeWebsite(db, actor, full, {
      ...input,
      content: { ...input.content, headline: "Different" },
    }),
    /request changed/,
  );
  assert.deepEqual(await publishedFixItCopy(db), defaultFixItCopy);
  await assert.rejects(
    reviewWebsite(
      db,
      { ...actor, id: "preview-other" },
      { id: saved.id, decision: "approve", baseRevision: source.revision },
    ),
    /requires|permission|Owner/i,
  );
  const [before] = await db.query<{ price: number }>(
    "SELECT price FROM reserve_services WHERE id=$1",
    ["signature"],
  );
  await reviewWebsite(db, owner, {
    id: saved.id,
    decision: "approve",
    baseRevision: source.revision,
  });
  assert.deepEqual(await publishedFixItCopy(db), input.content);
  const [after] = await db.query<{
    price: number;
    description: string;
    revision: number;
  }>("SELECT price,description,revision FROM reserve_services WHERE id=$1", [
    "signature",
  ]);
  assert.equal(after.price, before.price);
  assert.equal(after.description, input.serviceChanges[0].description);
  assert.equal(after.revision, 2);
  await assert.rejects(
    reviewWebsite(db, owner, {
      id: saved.id,
      decision: "approve",
      baseRevision: source.revision,
    }),
    /already reviewed/,
  );
  const [history] = await db.query<{ content: unknown }>(
    "SELECT content FROM reserve_website_proposals WHERE id=$1 AND state='approved'",
    [saved.id],
  );
  assert.deepEqual(history.content, input.content);
  await revokeBusiness(db, actor, full.id);
  await assert.rejects(
    proposeWebsite(db, actor, full, {
      ...input,
      requestId: randomUUID(),
      baseRevision: 3,
    }),
    /revoked/,
  );
});
test("approval compares both site and service revisions atomically; rejected proposals have no side effects", async () => {
  const grant = await grantBusiness(
      db,
      actor,
      "katie",
      "client",
      "E".repeat(43),
      true,
    ),
    source = await websiteSource(db, actor, grant);
  const input = {
    requestId: randomUUID(),
    websiteId: "fix-it-shop",
    baseRevision: source.revision,
    content: { headline: "Another draft", about: "Proposed content" },
    serviceChanges: [
      { id: "signature", baseRevision: 2, description: "Another description" },
    ],
  };
  const first = await proposeWebsite(db, actor, grant, input),
    second = await proposeWebsite(db, actor, grant, {
      ...input,
      requestId: randomUUID(),
    });
  await db.query(
    "UPDATE reserve_services SET revision=revision+1 WHERE id='signature'",
  );
  await assert.rejects(
    reviewWebsite(db, owner, {
      id: first.id,
      baseRevision: source.revision,
      decision: "approve",
    }),
    /Service changed/,
  );
  assert.equal(
    (await publishedFixItCopy(db)).headline,
    "Synthetic revised introduction",
  );
  await reviewWebsite(db, owner, {
    id: first.id,
    baseRevision: source.revision,
    decision: "reject",
  });
  assert.equal(
    (await publishedFixItCopy(db)).headline,
    "Synthetic revised introduction",
  );
  const latest = await proposeWebsite(db, actor, grant, {
    ...input,
    requestId: randomUUID(),
    serviceChanges: [],
  });
  await reviewWebsite(db, owner, {
    id: latest.id,
    baseRevision: source.revision,
    decision: "approve",
  });
  await assert.rejects(
    reviewWebsite(db, owner, {
      id: second.id,
      baseRevision: source.revision,
      decision: "approve",
    }),
    /Website changed/,
  );
  assert.equal((await publishedFixItCopy(db)).headline, "Another draft");
});
test("connected proposals cannot overwrite a pending local Brands draft", async () => {
  const grant = await grantBusiness(
      db,
      actor,
      "katie",
      "client",
      "F".repeat(43),
      true,
    ),
    source = await websiteSource(db, actor, grant);
  await db.query(
    "UPDATE reserve_provider_brands SET draft=jsonb_set(draft,'{headline}','\"Unreviewed local brand draft\"'::jsonb),revision=revision+1 WHERE provider_id='katie'",
  );
  await assert.rejects(
    proposeWebsite(db, actor, grant, {
      requestId: randomUUID(),
      websiteId: "fix-it-shop",
      baseRevision: source.revision + 1,
      content: { headline: "Remote draft", about: "Remote wording" },
      serviceChanges: [],
    }),
    /brand draft/,
  );
  assert.equal((await publishedFixItCopy(db)).headline, "Another draft");
});
