import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { wrapPglite, schema, seed, type Database } from "../lib/db";
import { applyReviewedMigrations, migrationManifest } from "../lib/booking-migrations";
// PGlite has no multi-session advisory lock; host lock must be verified on Postgres.
const withoutAdvisory = (db: Database): Database => ({ ...db, transaction: fn => db.transaction(tx => fn({ query: (sql,params) => sql.includes("pg_advisory_xact_lock") ? Promise.resolve([]) : tx.query(sql,params) })) });
test("migration planning emits versioned checksums without a database", async () => {
  const manifest = await migrationManifest(); assert.ok(manifest.length > 10);
  assert.deepEqual(manifest.map(m => m.file),manifest.map(m => m.file).sort());
  assert.ok(manifest.every(m => /^[a-f0-9]{64}$/.test(m.sha256)));
});
test("a migration failure rolls back all prior schema changes", async () => {
  const pg = new PGlite(); await pg.waitReady;
  const db = wrapPglite(pg);
  const failure: Database = { ...db, transaction: fn => db.transaction(tx => fn({ query: (sql,params) => {
    if (sql.includes("pg_advisory_xact_lock")) return Promise.resolve([]);
    if (sql.includes("reserve_services")) throw Error("Injected migration failure");
    return tx.query(sql,params);
  } })) };
  try {
    await assert.rejects(applyReviewedMigrations(failure), /Injected/);
    const rows = await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'reserve_%'");
    assert.equal(rows.length,0);
  } finally { await pg.close(); }
});
test("reapplying preserved migrations keeps existing account data", async () => {
  const pg = new PGlite(); await pg.waitReady; const db = wrapPglite(pg);
  try {
    await schema(db); await seed(db);
    await db.query("UPDATE reserve_users SET name='Preserved customer' WHERE id='preview-client'");
    await applyReviewedMigrations(withoutAdvisory(db));
    const [user] = await db.query("SELECT name FROM reserve_users WHERE id='preview-client'");
    assert.equal(user.name,"Preserved customer");
  } finally { await pg.close(); }
});
