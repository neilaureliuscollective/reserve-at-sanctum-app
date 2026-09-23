import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { schema, wrapPglite } from "../lib/db";

test("existing single-business records are assigned to organization #001 without changing appointments", async () => {
  const pg = new PGlite();
  try {
    const db = wrapPglite(pg);
    for (let i = 1; i <= 4; i++) {
      const name = ["core", "chair", "studio_blocks", "command_center"][i - 1];
      const sql = await readFile(`migrations/${String(i).padStart(3, "0")}_${name}.sql`, "utf8");
      for (const statement of sql.split(";").map((part) => part.trim()).filter(Boolean))
        await db.query(statement);
    }
    await db.query("INSERT INTO reserve_providers(id,name,enabled) VALUES('katie','Katie',true)");
    await db.query("INSERT INTO reserve_users(id,name,email,role,provider_id) VALUES('legacy','Legacy','legacy@example.test','staff','katie')");
    await db.query("INSERT INTO reserve_services(id,provider_id,name,description,minutes,price,enabled) VALUES('legacy-service','katie','Legacy service','',45,4500,true)");
    await schema(db);
    await schema(db);
    const [user] = await db.query<{ organization_id: string }>("SELECT organization_id FROM reserve_users WHERE id='legacy'");
    const [service] = await db.query<{ organization_id: string; location_id: string }>("SELECT organization_id,location_id FROM reserve_services WHERE id='legacy-service'");
    assert.equal(user.organization_id, "reserve-at-sanctum");
    assert.deepEqual([service.organization_id, service.location_id], ["reserve-at-sanctum", "eunice-sanctum"]);
    assert.equal((await db.query("SELECT * FROM reserve_schema_migrations WHERE name='005_professional_core.sql'")).length, 1);
  } finally {
    await pg.close();
  }
});
