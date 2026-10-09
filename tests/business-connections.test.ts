import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { schema, seed, wrapPglite, type Database } from "../lib/db";
import {
  grantBusiness,
  readBusinessGrant,
  revokeBusiness,
  businessSchedule,
  verifyBusinessClaims,
  consentRedirect,
  scheduleInput,
} from "../lib/business-connections";
import type { Actor } from "../lib/booking";
let pg: PGlite, db: Database;
const staff: Actor = {
  id: "preview-katie",
  name: "Synthetic Katie",
  email: "katie@preview.invalid",
  role: "operator",
  provider_id: "katie",
};
const key = "A".repeat(43),
  client = "synthetic-oauth";
before(async () => {
  pg = new PGlite();
  await pg.waitReady;
  db = wrapPglite(pg);
  await schema(db);
  await seed(db);
});
after(async () => {
  await pg.close();
});
test("OAuth claims require the native issuer, client, verified subject and expiry", () => {
  const claims = {
    sub: "user",
    client_id: client,
    iss: "https://auth.example/auth/v1",
    aud: "authenticated",
    exp: Math.floor(Date.now() / 1000) + 100,
  };
  verifyBusinessClaims(claims, "user", client, claims.iss);
  for (const bad of [
    { client_id: "other" },
    { sub: "other" },
    { iss: "evil" },
    { aud: "anon" },
    { is_anonymous: true },
    { exp: 0 },
  ])
    assert.throws(() =>
      verifyBusinessClaims({ ...claims, ...bad }, "user", client, claims.iss),
    );
  assert.throws(() =>
    consentRedirect(
      "https://evil.example/callback?code=x&state=" + key,
      "https://public.example/api/business-connections/callback",
    ),
  );
  assert.throws(() => scheduleInput.parse({ date: "2026-10-10", days: 8 }));
});
test("explicit grant is actor/provider/client/link bound, idempotent and revoked immediately", async () => {
  const grant = await grantBusiness(db, staff, "katie", client, key);
  assert.equal(
    (await grantBusiness(db, staff, "katie", client, key)).id,
    grant.id,
  );
  for (const wrong of [
    { ...staff, id: "preview-client" },
    { ...staff, provider_id: "other" },
  ])
    await assert.rejects(readBusinessGrant(db, wrong, client, key));
  await assert.rejects(readBusinessGrant(db, staff, "other-client", key));
  await assert.rejects(
    grantBusiness(db, staff, "other", client, "B".repeat(43)),
  );
  const schedule = await businessSchedule(db, staff, grant, {
    date: "2026-11-01",
    days: 1,
  });
  assert.equal(schedule.providerId, "katie");
  assert.equal(schedule.days, 1);
  assert(!JSON.stringify(schedule).includes("email"));
  await revokeBusiness(db, staff, grant.id);
  await assert.rejects(readBusinessGrant(db, staff, client, key), /revoked/);
  await assert.rejects(
    grantBusiness(db, staff, "katie", client, key),
    /changed/,
  );
});
