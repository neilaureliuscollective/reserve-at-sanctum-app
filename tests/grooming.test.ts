import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { buildGroomingBlueprint } from "../lib/grooming";
import { schema, wrapPglite } from "../lib/db";

test("grooming blueprint responds to the client’s stated priorities", () => {
  const blueprint = buildGroomingBlueprint({
    focus: ["Sharper beard structure"],
    maintenance: "Five minutes or less",
    skin: "Redness or irritation",
    hair: "Wavy",
    beard: "Full beard",
  });
  assert.match(blueprint.blueprint.direction, /beard line/);
  assert.match(blueprint.blueprint.ritual[0], /low-friction/);
  assert.match(blueprint.blueprint.ritual[2], /three repeatable steps/);
});

test("grooming profiles persist as private account-owned records", async () => {
  const pg = new PGlite();
  await pg.waitReady;
  const db = wrapPglite(pg);
  await schema(db);
  await db.query("INSERT INTO reserve_users(id,name,email) VALUES($1,$2,$3)", ["client-one", "Jordan", "jordan@example.test"]);
  await db.query(
    "INSERT INTO reserve_grooming_profiles(user_id,focus,maintenance,skin,hair,beard,blueprint) VALUES($1,$2::jsonb,$3,$4,$5,$6,$7::jsonb)",
    ["client-one", JSON.stringify(["Healthier-looking skin"]), "Five minutes or less", "Dryness or tightness", "Wavy", "Short or stubble", JSON.stringify({ direction: "A clear direction", ritual: ["Cleanse"] })],
  );
  const rows = await db.query<{ user_id: string }>("SELECT user_id FROM reserve_grooming_profiles WHERE user_id=$1", ["client-one"]);
  assert.deepEqual(rows.map((row) => row.user_id), ["client-one"]);
  assert.equal((await db.query("SELECT * FROM reserve_grooming_profiles WHERE user_id=$1", ["another-client"])).length, 0);
  await pg.close();
});
