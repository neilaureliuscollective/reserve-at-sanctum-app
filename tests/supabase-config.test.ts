import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

function config(values: Record<string, string>) {
  const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e",
    'const m = await import("./lib/supabase-config.ts"); const c = m.default || m; console.log(JSON.stringify({url:c.supabaseUrl,key:c.supabaseKey,configured:c.hasSupabase()}));',
  ], { encoding: "utf8", env: {
    ...process.env,
    NODE_ENV: "production",
    NEXT_PUBLIC_SUPABASE_URL: "",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    ...values,
  } });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test("production uses the configured backend and prefers the publishable key", () => {
  assert.deepEqual(config({
    NEXT_PUBLIC_SUPABASE_URL: "https://configured.example",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-test-key",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "legacy-test-key",
  }), { url: "https://configured.example", key: "public-test-key", configured: true });
});

test("production retains the existing anon-key fallback", () => {
  assert.deepEqual(config({
    NEXT_PUBLIC_SUPABASE_URL: "https://configured.example",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "legacy-test-key",
  }), { url: "https://configured.example", key: "legacy-test-key", configured: true });
});

test("missing production configuration never selects the old hardcoded project", () => {
  assert.equal(config({}).configured, false);
});
