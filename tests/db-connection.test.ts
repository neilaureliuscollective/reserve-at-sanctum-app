import test from "node:test";
import assert from "node:assert/strict";
import { serverlessDatabaseUrl } from "../lib/db-connection";

test("Reserve connections preserve the explicitly configured host", () => {
  const value = "postgresql://postgres:p%40ssword@db.wfbiytzlaokchfaxgwtt.supabase.co:5432/postgres?sslmode=require";
  const result = new URL(serverlessDatabaseUrl(value));
  assert.equal(result.hostname, "db.wfbiytzlaokchfaxgwtt.supabase.co");
  assert.equal(result.port, "5432");
  assert.equal(result.username, "postgres");
  assert.equal(result.password, "p%40ssword");
  assert.equal(result.searchParams.get("sslmode"), "require");
});

test("a connection to another project is never redirected", () => {
  const value = "postgresql://postgres:password@db.other.supabase.co:5432/postgres";
  assert.equal(serverlessDatabaseUrl(value), value);
});
