import test from "node:test";
import assert from "node:assert/strict";
import { serverlessDatabaseUrl } from "../lib/db-connection";

test("production accepts only the shared project's transaction pooler", () => {
    const valid = "postgresql://reserve_app.volpzkfsnmtztrovexcw:password@aws-1-us-east-2.pooler.supabase.com:6543/postgres?sslmode=require";
    assert.equal(serverlessDatabaseUrl(valid, true), valid);
    assert.throws(() => serverlessDatabaseUrl(valid.replace("volpzkfsnmtztrovexcw", "wfbiytzlaokchfaxgwtt"), true));
    assert.throws(() => serverlessDatabaseUrl(valid.replace("reserve_app.", "postgres."), true));
    assert.throws(() => serverlessDatabaseUrl(valid.replace(":6543", ":5432"), true));
    assert.throws(() => serverlessDatabaseUrl(valid.replace(".pooler.supabase.com", ".example.com"), true));
});

test("local preview connections are never rewritten", () => {
  const value = "postgresql://postgres:password@localhost:5432/postgres";
  assert.equal(serverlessDatabaseUrl(value), value);
});
