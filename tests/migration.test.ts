import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { wrapPglite, schema } from "../lib/db";
test("legacy appointment and Chair history survive baseline adoption and browser roles remain denied", async () => {
  const pg = new PGlite();
  await pg.waitReady;
  const db = wrapPglite(pg);
  try {
    for (const file of [
      "001_core.sql",
      "002_chair.sql",
      "003_studio_blocks.sql",
      "004_command_center.sql",
    ])
      await db.exec(await readFile(`migrations/${file}`, "utf8"));
    await db.query(
      "INSERT INTO reserve_users(id,name,email) VALUES('legacy-client','Legacy client','legacy@example.test')",
    );
    await db.query(
      "INSERT INTO reserve_providers(id,name,enabled) VALUES('katie','Katie Guidry',true)",
    );
    await db.query(
      "INSERT INTO reserve_services(id,provider_id,name,description,minutes,buffer,price,enabled) VALUES('legacy-service','katie','Legacy service','Approved legacy description',45,15,4500,true)",
    );
    await db.query(
      "INSERT INTO reserve_appointments(id,client_id,provider_id,service_id,starts_at,ends_at,busy_until,price,request_key,original_start) VALUES('legacy-visit','legacy-client','katie','legacy-service',now()+interval '2 days',now()+interval '2 days 45 minutes',now()+interval '2 days 60 minutes',4500,'legacy-request',now()+interval '2 days')",
    );
    await db.query(
      "INSERT INTO reserve_chair_profiles(user_id,intent,conversation,goal,share_with_katie) VALUES('legacy-client','Clean me up.','Give me some quiet.','Sharper.',true)",
    );
    await db.query(
      "INSERT INTO reserve_chair_notes(user_id,provider_id,author_id,body) VALUES('legacy-client','katie','legacy-client','Preserved service detail')",
    );
    await schema(db);
    await schema(db);
    const [visit] = await db.query(
      "SELECT * FROM reserve_appointments WHERE id='legacy-visit'",
    );
    assert.equal(visit.customer_id, "legacy-client");
    assert.equal(visit.price, 4500);
    assert.equal(
      (visit.snapshot as { service: string }).service,
      "Legacy service",
    );
    assert.equal(
      (await db.query("SELECT body FROM reserve_chair_notes"))[0].body,
      "Preserved service detail",
    );
    assert.equal(
      (
        await db.query(
          "SELECT booking_enabled FROM reserve_locations WHERE id='eunice'",
        )
      )[0].booking_enabled,
      false,
    );
    await db.exec(
      "CREATE ROLE reserve_browser_test NOLOGIN; GRANT USAGE ON SCHEMA public TO reserve_browser_test; GRANT SELECT ON reserve_appointments,reserve_chair_notes,reserve_customers TO reserve_browser_test;",
    );
    await db.transaction(async (tx) => {
      await tx.exec("SET LOCAL ROLE reserve_browser_test");
      assert.equal(
        (await tx.query("SELECT * FROM reserve_appointments")).length,
        0,
      );
      assert.equal(
        (await tx.query("SELECT * FROM reserve_chair_notes")).length,
        0,
      );
      assert.equal(
        (await tx.query("SELECT * FROM reserve_customers")).length,
        0,
      );
    });
    await db.exec(await readFile("scripts/runtime-role.sql", "utf8"));
    await db.transaction(async (tx) => {
      await tx.exec("SET LOCAL ROLE reserve_runtime");
      assert.equal(
        (await tx.query("SELECT * FROM reserve_appointments")).length,
        1,
      );
      await tx.query(
        "INSERT INTO reserve_audit(actor_id,appointment_id,action) VALUES('legacy-client','legacy-visit','runtime-test')",
      );
      await tx.query(
        "INSERT INTO reserve_operation_events(actor_id,entity_id,action) VALUES('legacy-client','legacy-visit','runtime-test')",
      );
    });
    await assert.rejects(
      () =>
        db.transaction(async (tx) => {
          await tx.exec("SET LOCAL ROLE reserve_runtime");
          await tx.query("SELECT * FROM reserve_migrations");
        }),
      /permission denied/,
    );
  } finally {
    await pg.close();
  }
});
