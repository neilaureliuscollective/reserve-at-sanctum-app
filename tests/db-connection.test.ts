import test from "node:test";
import assert from "node:assert/strict";
import { serverlessDatabaseUrl } from "../lib/db-connection";

test("Reserve direct connection switches to its serverless transaction pooler", () => {
  const value = "postgresql://postgres:p%40ssword@db.wfbiytzlaokchfaxgwtt.supabase.co:5432/postgres?sslmode=require";
  const result = new URL(serverlessDatabaseUrl(value));
  assert.equal(result.hostname, "aws-0-us-west-2.pooler.supabase.com");
  assert.equal(result.port, "6543");
  assert.equal(result.username, "postgres.wfbiytzlaokchfaxgwtt");
  assert.equal(result.password, "p%40ssword");
  assert.equal(result.searchParams.get("sslmode"), "require");
});

test("a connection to another project is never redirected", () => {
  const value = "postgresql://postgres:password@db.other.supabase.co:5432/postgres";
  assert.equal(serverlessDatabaseUrl(value), value);
});
