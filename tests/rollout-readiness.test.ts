import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { wrapPglite, type Database } from "../lib/db";
import type { Actor } from "../lib/booking";
import { suppressBusinessLegacyAccess } from "../lib/business-workspace";
import { requireBusinessAccess } from "../lib/business-authority";
import { reserveAuthDelivery } from "../lib/auth-confirmation";
import { featureSchemaReady } from "../lib/feature-readiness";
const actor: Actor = { id: "synthetic", name: "Synthetic", email: "test@preview.invalid", role: "operator", provider_id: "katie" };
const enabled = { RESERVE_BUSINESS_AUTHORITY_ENABLED: "true" };
test("old schema: flag off preserves legacy sign-in; existing membership still suppresses stale authority when off", async () => {
  const pg = new PGlite(); await pg.waitReady;
  const db = wrapPglite(pg);
  try {
    assert.equal(await suppressBusinessLegacyAccess(db, actor, {}), actor);
    await assert.rejects(requireBusinessAccess(db, actor, "synthetic", "appointments.read", {}), /not been commissioned/);
    await db.query("CREATE TABLE reserve_business_memberships(user_id text, revoked_at timestamptz)");
    assert.equal(await suppressBusinessLegacyAccess(db, actor, {}), actor);
    await db.query("INSERT INTO reserve_business_memberships VALUES('synthetic',now())");
    assert.equal((await suppressBusinessLegacyAccess(db, actor, {})).role, "client");
    assert.equal((await suppressBusinessLegacyAccess(db, actor, enabled)).role, "client");
  } finally { await pg.close(); }
});
test("old/partial schema: enabled management fails closed and delivery fails before any transport or budget mutation", async () => {
  const pg = new PGlite(); await pg.waitReady;
  const db = wrapPglite(pg);
  try {
    const safe = await suppressBusinessLegacyAccess(db, actor, enabled);
    assert.equal(safe.role, "client"); assert.equal(safe.provider_id, null);
    await assert.rejects(requireBusinessAccess(db, actor, "synthetic", "appointments.read", enabled), /Business management is not ready/);
    await assert.rejects(reserveAuthDelivery(db, actor.email), /Account creation and confirmation are not ready/);
    await db.query("CREATE TABLE reserve_auth_delivery_limits(key_hash text PRIMARY KEY)");
    assert.equal(await featureSchemaReady(db, "authDelivery"), false);
    await assert.rejects(reserveAuthDelivery(db, actor.email), /not ready/);
    await db.query("ALTER TABLE reserve_auth_delivery_limits ADD COLUMN window_start timestamptz NOT NULL DEFAULT now(), ADD COLUMN attempts integer NOT NULL DEFAULT 1");
    assert.equal(await reserveAuthDelivery(db, actor.email), true);
    assert.equal(await reserveAuthDelivery(db, actor.email), false);
    assert.equal(await suppressBusinessLegacyAccess(db, {...actor, role: "owner"}, enabled).then(a=>a.role), "owner");
  } finally { await pg.close(); }
});
test("normal database failures propagate unchanged; readiness never bypasses authorization or throttling", async () => {
  for (const code of ["42501", "08006", "XX000"]) {
    const error = Object.assign(Error("synthetic database failure"), {code});
    const db: Database = {query: async()=>{throw error;}, transaction: async()=>{throw error;}};
    await assert.rejects(suppressBusinessLegacyAccess(db, actor, enabled), e=>e===error);
    await assert.rejects(suppressBusinessLegacyAccess(db, actor, {}), e=>e===error);
    await assert.rejects(requireBusinessAccess(db, actor, "synthetic", "appointments.read", enabled), e=>e===error);
    await assert.rejects(reserveAuthDelivery(db, actor.email), e=>e===error);
  }
});
