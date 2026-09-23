import { chairSchema } from "../lib/chair-validation";
import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { schema, wrapPglite } from "../lib/db";
import { emptyChair, consentFiltered, type ChairInput } from "../lib/chair";
import {
  getChair,
  saveChair,
  deleteChair,
  listChairs,
  saveChairNote,
} from "../lib/chair-store";
import type { Actor } from "../lib/booking";

test("Chair consent strips unapproved life context and unrelated follow-up answers", () => {
  const input: ChairInput = {
    ...emptyChair,
    life: "Been better.",
    load: "Work",
  };
  assert.equal(consentFiltered(input).life, "");
  assert.equal(consentFiltered({ ...input, save_life: true }).life, "");
  assert.equal(
    consentFiltered({ ...input, save_life: true, share_with_katie: true }).load,
    "Work",
  );
  assert.equal(
    consentFiltered({
      ...input,
      life: "Yeah. I’m good.",
      save_life: true,
      share_with_katie: true,
    }).load,
    "",
  );
  assert.equal(
    chairSchema.safeParse({ ...input, life: "diagnosis" }).success,
    false,
  );
  assert.equal(
    chairSchema.safeParse({ ...input, user_id: "someone-else" }).success,
    false,
  );
});

test("Chair access, persistence, revocation, expiry, conflicts and deletion are server-authoritative", async () => {
  const pg = new PGlite();
  await pg.waitReady;
  const db = wrapPglite(pg);
  await schema(db);
  await schema(db);
  const client: Actor = {
    id: "chair-client",
    name: "Client",
    email: "client@example.test",
    role: "client",
    provider_id: null,
  };
  const other: Actor = { ...client, id: "other", email: "other@example.test" };
  const katie: Actor = {
    ...client,
    id: "katie",
    email: "katie@example.test",
    role: "staff",
    provider_id: "katie",
  };
  const wrongStaff: Actor = {
    ...katie,
    id: "other-staff",
    email: "staff@example.test",
    provider_id: "neil",
  };
  for (const a of [client, other, katie, wrongStaff])
    await db.query(
      "INSERT INTO reserve_users(id,name,email,role,provider_id) VALUES($1,$2,$3,$4,$5)",
      [a.id, a.name, a.email, a.role, a.provider_id],
    );
  try {
    const first = await saveChair(db, client, {
      ...emptyChair,
      life: "Been better.",
      load: "Work",
      share_with_katie: false,
      save_life: true,
    });
    assert.ok(first);
    assert.equal(first.life, "");
    assert.equal(await getChair(db, other), null);
    assert.equal((await listChairs(db, katie)).length, 0);
    await assert.rejects(() => listChairs(db, client));
    await assert.rejects(() => listChairs(db, wrongStaff));
    await assert.rejects(() =>
      saveChairNote(db, katie, {
        user_id: client.id,
        body: "Cut detail",
        revision: 0,
      }),
    );
    const input = {
      ...emptyChair,
      revision: 1,
      share_with_katie: true,
      save_life: true,
      life: "Got a lot going on.",
      load: "Work",
    };
    const shared = await saveChair(db, client, input);
    assert.equal(shared?.life, input.life);
    await assert.rejects(() => saveChair(db, client, input), /another tab/);
    await saveChairNote(db, katie, {
      user_id: client.id,
      body: "Keep length at the crown",
      revision: 0,
    });
    const card = (await listChairs(db, katie))[0];
    assert.equal(card.service_note, "Keep length at the crown");
    assert.equal("service_note" in (await getChair(db, client))!, false);
    await assert.rejects(() =>
      saveChairNote(db, client, {
        user_id: client.id,
        body: "Forged",
        revision: 1,
      }),
    );
    await assert.rejects(() =>
      saveChairNote(db, wrongStaff, {
        user_id: client.id,
        body: "Forged",
        revision: 1,
      }),
    );
    await assert.rejects(
      () =>
        saveChairNote(db, katie, {
          user_id: client.id,
          body: "Stale",
          revision: 0,
        }),
      /changed/,
    );
    await db.query(
      "UPDATE reserve_chair_context SET expires_at=now()-interval '1 day'",
    );
    assert.equal((await getChair(db, client))?.life, "");
    assert.equal(
      (await db.query("SELECT * FROM reserve_chair_context")).length,
      0,
    );
    await saveChair(db, client, {
      ...input,
      revision: 2,
      share_with_katie: false,
    });
    assert.equal((await listChairs(db, katie)).length, 0);
    await assert.rejects(() =>
      saveChairNote(db, katie, {
        user_id: client.id,
        body: "No access now",
        revision: 1,
      }),
    );
    await db.query(
      "INSERT INTO reserve_grooming_profiles(user_id) VALUES($1)",
      [client.id],
    );
    await deleteChair(db, other);
    assert.ok(await getChair(db, client));
    await deleteChair(db, client);
    assert.equal(await getChair(db, client), null);
    assert.equal(
      (await db.query("SELECT * FROM reserve_chair_notes")).length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "SELECT * FROM reserve_grooming_profiles WHERE user_id=$1",
          [client.id],
        )
      ).length,
      1,
    );
    const rls = await db.query<{ relname: string; relrowsecurity: boolean }>(
      "SELECT relname,relrowsecurity FROM pg_class WHERE relname IN ('reserve_chair_profiles','reserve_chair_context','reserve_chair_notes','reserve_chair_funnel')",
    );
    assert.equal(rls.length, 4);
    assert.ok(rls.every((r) => r.relrowsecurity));
    await db.query("CREATE ROLE chair_browser");
    await db.query(
      "GRANT SELECT ON reserve_chair_profiles,reserve_chair_context,reserve_chair_notes TO chair_browser",
    );
    await saveChair(db, client, { ...emptyChair, share_with_katie: true });
    await db.query("SET ROLE chair_browser");
    assert.equal(
      (await db.query("SELECT * FROM reserve_chair_profiles")).length,
      0,
    );
    await db.query("RESET ROLE");
  } finally {
    await pg.close();
  }
});

test("Chair request parsing bounds payloads and hides invalid personal text", async () => {
  const { readChairJson } = await import("../lib/chair-http");
  await assert.rejects(
    () =>
      readChairJson(
        new Request("https://reserve.test/api/chair", {
          method: "PUT",
          body: '{"detail":"private unfinished text',
        }),
      ),
    /Please send a valid check-in/,
  );
  await assert.rejects(
    () =>
      readChairJson(
        new Request("https://reserve.test/api/chair", {
          method: "PUT",
          body: '{"detail":"' + "a".repeat(5000) + '"}',
        }),
      ),
    /too large/,
  );
  assert.deepEqual(
    await readChairJson(
      new Request("https://reserve.test/api/chair", {
        method: "PUT",
        body: '{"event":"started"}',
      }),
    ),
    { event: "started" },
  );
});
