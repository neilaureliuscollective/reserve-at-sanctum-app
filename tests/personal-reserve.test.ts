import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { schema, seed, wrapPglite, type Database } from "../lib/db";
import { type Actor, BookingError } from "../lib/booking";
import {
  readRoutine,
  saveRoutine,
  clearRoutine,
} from "../lib/personal-reserve";
import {
  conciergeRate,
  reserveModelSpend,
  settleModelSpend,
  tokenCost,
  modelConfig,
  type ModelConfig,
} from "../lib/concierge-budget";
import { memberConcierge, conciergeInput } from "../lib/member-concierge";
import { safeContext, routineTemplate } from "@aethelios/concierge-core";
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
let pg: PGlite, db: Database;
before(async () => {
  pg = new PGlite();
  await pg.waitReady;
  db = wrapPglite(pg);
  await schema(db);
  await seed(db);
});
after(async () => pg.close());
const conflict = (e: unknown) => e instanceof BookingError && e.status === 409;
test("routines isolate members, reject staff and stale writes, and retain revision after clearing", async () => {
  const draft = { ...routineTemplate("performance"), revision: 0 };
  const saved = await saveRoutine(db, member, draft);
  assert.equal(saved.revision, 1);
  assert.equal(await readRoutine(db, other), null);
  await assert.rejects(
    saveRoutine(db, { ...member, role: "owner" }, draft),
    /customer accounts/,
  );
  await assert.rejects(saveRoutine(db, member, draft), conflict);
  const attempts = await Promise.allSettled([
    saveRoutine(db, member, { ...draft, revision: 1, title: "First" }),
    saveRoutine(db, member, { ...draft, revision: 1, title: "Second" }),
  ]);
  assert.equal(attempts.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal((await readRoutine(db, member))?.revision, 2);
  const cleared = await clearRoutine(db, member, 2);
  assert.equal(cleared.cleared, true);
  assert.deepEqual(cleared.steps, []);
  assert.equal(cleared.revision, 3);
  await assert.rejects(saveRoutine(db, member, draft), conflict);
  await assert.rejects(clearRoutine(db, other, 3), conflict);
  const resaved = await saveRoutine(db, member, { ...draft, revision: 3 });
  assert.equal(resaved.revision, 4);
  assert.equal(resaved.cleared, false);
  await assert.rejects(
    saveRoutine(db, member, { ...draft, revision: 4, userId: other.id }),
  );
});
test("verified concierge tools never invent memberships, live inventory, clinical care or confirmed bookings", async () => {
  for (const actor of [member, other])
    await db.query("DELETE FROM reserve_concierge_rate WHERE user_id=$1", [
      actor.id,
    ]);
  const benefits = await memberConcierge(db, member, {
    message: "What benefits do I have?",
  });
  assert.match(benefits.text, /do not currently have/);
  assert.equal(benefits.mode, "verified");
  const medical = await memberConcierge(db, member, {
    message: "Build a peptide dosing workout routine",
  });
  assert.equal(medical.mode, "education");
  assert.match(medical.text, /does not recommend dosing/);
  assert.equal(medical.routine, undefined);
  const urgent = await memberConcierge(db, member, {
    message: "Workout with chest pain",
  });
  assert.match(urgent.text, /911/);
  assert.equal(urgent.routine, undefined);
  const commerce = await memberConcierge(db, member, {
    message: "Buy beard oil",
  });
  assert.match(commerce.text, /not verified inventory/);
  assert.match(commerce.text, /not active/);
  const appointments = await memberConcierge(db, member, {
    message: "Book Katie next Friday",
  });
  assert.ok(
    appointments.booking?.services.some((s) => s.label.includes("Katie")),
  );
  assert.match(appointments.text, /exact date/);
  assert.match(appointments.text, /confirm/);
  assert.equal(
    conciergeInput.safeParse({ message: "Hi", userId: other.id }).success,
    false,
  );
  await assert.rejects(
    memberConcierge(db, { ...member, role: "staff" }, { message: "Hi" }),
    /customer accounts/,
  );
});
test("concierge reads booking closure from authoritative location state", async () => {
  await db.query(
    "UPDATE reserve_locations SET booking_enabled=false WHERE id='eunice'",
  );
  try {
    const result = await memberConcierge(db, other, {
      message: "Find an appointment",
    });
    assert.match(result.text, /No Sanctum/);
    assert.deepEqual(result.booking?.services, []);
  } finally {
    await db.query(
      "UPDATE reserve_locations SET booking_enabled=true WHERE id='eunice'",
    );
  }
});
test("rate admission is atomic and permits only six requests per minute", async () => {
  await db.query("DELETE FROM reserve_concierge_rate WHERE user_id=$1", [
    member.id,
  ]);
  const results = await Promise.allSettled(
    Array.from({ length: 10 }, () => conciergeRate(db, member, 120000)),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 6);
  await conciergeRate(db, member, 180000);
});
test("spend reservation rolls back failed admission, accounts uncertain calls, and settles once", async () => {
  const config: ModelConfig = {
    model: "test-model",
    inputPrice: 1,
    outputPrice: 2,
    memberCents: 10,
    tenantCents: 15,
  };
  const now = new Date("2026-10-07T12:00:00Z");
  const reserved = await reserveModelSpend(db, member, config, 6, now);
  await assert.rejects(
    reserveModelSpend(db, member, config, 6, now),
    /allowance/,
  );
  const [tenant] = await db.query<{ charged_cents: number }>(
    "SELECT charged_cents FROM reserve_concierge_budgets WHERE subject='tenant:legacy-reserve' AND period='2026-10'",
  );
  assert.equal(tenant.charged_cents, 6);
  await settleModelSpend(db, member, reserved, null, config);
  await settleModelSpend(db, member, reserved, { input: 1, output: 1 }, config);
  const [call] = await db.query<{ status: string; charged_cents: number }>(
    "SELECT status,charged_cents FROM reserve_concierge_calls WHERE id=$1",
    [reserved.id],
  );
  assert.equal(call.status, "uncertain");
  assert.equal(call.charged_cents, 6);
  const otherCall = await reserveModelSpend(db, other, config, 6, now);
  await settleModelSpend(
    db,
    other,
    otherCall,
    { input: 100, output: 100 },
    config,
  );
  assert.equal(tokenCost(100, 100, config), 1);
  const [total] = await db.query<{ charged_cents: number }>(
    "SELECT charged_cents FROM reserve_concierge_budgets WHERE subject='tenant:legacy-reserve' AND period='2026-10'",
  );
  assert.equal(total.charged_cents, 7);
  assert.equal(modelConfig(), null);
});
test("vendored Aethelios core matches its upstream pin and excludes private context and executors", () => {
  const root = new URL("../vendor/aethelios-concierge-core/", import.meta.url);
  const pin = JSON.parse(
    readFileSync(new URL("provenance.json", root), "utf8"),
  );
  assert.equal(pin.commit, "7405ebf87625291b25cece7365c2cf44db9843c1");
  for (const [name, digest] of Object.entries(pin.files))
    assert.equal(
      createHash("sha256")
        .update(readFileSync(new URL(name, root)))
        .digest("hex"),
      digest,
      name,
    );
  const context = safeContext({
    priority: "performance",
    routine: { title: "Test", steps: ["Move"] },
    founderMemory: "PRIVATE",
    userId: other.id,
  } as Parameters<typeof safeContext>[0]);
  assert.equal(JSON.stringify(context).includes("PRIVATE"), false);
  assert.equal(JSON.stringify(context).includes(other.id), false);
  const core = readFileSync(new URL("index.mjs", root), "utf8");
  assert.doesNotMatch(core, /^import\s/m);
});
test("optional conversation sends minimal own context, disables storage, and retains failed-call reservations", async () => {
  const keys = [
    "OPENAI_API_KEY",
    "RESERVE_CONCIERGE_MODEL",
    "RESERVE_CONCIERGE_INPUT_USD_PER_MILLION",
    "RESERVE_CONCIERGE_OUTPUT_USD_PER_MILLION",
    "RESERVE_CONCIERGE_MEMBER_MONTHLY_CENTS",
    "RESERVE_CONCIERGE_TENANT_MONTHLY_CENTS",
  ];
  const original = keys.map((k) => process.env[k]);
  try {
    Object.assign(process.env, {
      OPENAI_API_KEY: "test-only",
      RESERVE_CONCIERGE_MODEL: "test-model",
      RESERVE_CONCIERGE_INPUT_USD_PER_MILLION: "1",
      RESERVE_CONCIERGE_OUTPUT_USD_PER_MILLION: "2",
      RESERVE_CONCIERGE_MEMBER_MONTHLY_CENTS: "100",
      RESERVE_CONCIERGE_TENANT_MONTHLY_CENTS: "100",
    });
    await db.query("DELETE FROM reserve_concierge_rate WHERE user_id=$1", [
      member.id,
    ]);
    let calls = 0;
    const fake: typeof fetch = async (_url, init) => {
      calls++;
      const body = JSON.parse(String(init?.body));
      assert.equal(body.store, false);
      assert.equal(body.max_output_tokens, 600);
      assert.equal(body.model, "test-model");
      assert.match(body.instructions, /untrusted/);
      assert.doesNotMatch(
        body.input,
        /preview-other|founderMemory|preview-katie|jordan@/,
      );
      return Response.json({
        usage: { input_tokens: 100, output_tokens: 50 },
        output: [
          {
            content: [
              { type: "output_text", text: "Choose a manageable next step." },
            ],
          },
        ],
      });
    };
    const result = await memberConcierge(
      db,
      member,
      { message: "How can I make more time for myself?" },
      fake,
    );
    assert.equal(result.mode, "conversation");
    assert.equal(calls, 1);
    const failed: typeof fetch = async () => {
      calls++;
      throw Error("PRIVATE_PROVIDER_BODY must never be logged");
    };
    const fallback = await memberConcierge(
      db,
      member,
      { message: "Help me find more time today" },
      failed,
    );
    assert.equal(fallback.mode, "verified");
    assert.equal(calls, 2);
    const rows = await db.query<{ status: string }>(
      "SELECT status FROM reserve_concierge_calls WHERE user_id=$1 AND model='test-model'",
      [member.id],
    );
    assert.ok(rows.some((r) => r.status === "uncertain"));
  } finally {
    keys.forEach((k, i) => {
      if (original[i] === undefined) delete process.env[k];
      else process.env[k] = original[i];
    });
  }
});
test("new personal data and spend tables have RLS and no PUBLIC grants or browser policies", async () => {
  const names = [
    "reserve_member_routines",
    "reserve_concierge_rate",
    "reserve_concierge_budgets",
    "reserve_concierge_calls",
  ];
  const rows = await db.query<{ relname: string; relrowsecurity: boolean }>(
    "SELECT relname,relrowsecurity FROM pg_class WHERE relname=ANY($1::text[])",
    [names],
  );
  assert.equal(rows.length, 4);
  assert.ok(rows.every((r) => r.relrowsecurity));
  const grants = await db.query(
    "SELECT table_name FROM information_schema.table_privileges WHERE grantee='PUBLIC' AND table_name=ANY($1::text[])",
    [names],
  );
  assert.deepEqual(grants, []);
  const policies = await db.query(
    "SELECT tablename FROM pg_policies WHERE tablename=ANY($1::text[])",
    [names],
  );
  assert.deepEqual(policies, []);
});
