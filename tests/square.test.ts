import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { schema, seed, wrapPglite, type Database } from "../lib/db";
import { commerceStatus } from "../lib/commerce";
import { squarePublicStatus } from "../lib/square/config";
import { squareFetch } from "../lib/square/client";
import { squareBookingsStatus } from "../lib/square/bookings";
import {
  mapCatalogObject,
  mapLocationToSquare,
  mapProviderToSquareTeam,
  mapUserToSquareCustomer,
  squareCatalogFor,
  squareCustomerForUser,
  squareLocationFor,
  squareTeamMemberFor,
} from "../lib/square/mappings";
import {
  parseSquareWebhookEvent,
  payloadDigest,
  recordSquareWebhookEvent,
  routeSquareWebhook,
  squareWebhookSignature,
  verifySquareWebhookSignature,
} from "../lib/square/webhooks";
import { fulfillmentIntents, squareFulfillmentType } from "../lib/square/types";

let pg: PGlite, db: Database;

before(async () => {
  pg = new PGlite();
  await pg.waitReady;
  db = wrapPglite(pg);
  await schema(db);
  await seed(db);
});
after(async () => pg.close());

test("Square stays disabled without credentials and never exposes tokens", () => {
  const status = squarePublicStatus();
  assert.equal(status.enabled, false);
  assert.equal(status.environment, null);
  assert.equal(status.bookings, false);
  assert.equal("accessToken" in status, false);
  assert.equal(JSON.stringify(status).includes("EAAA"), false);
  assert.equal(squareBookingsStatus().channel, "internal");
  assert.equal(commerceStatus().connected, false);
});

test("squareFetch is a no-op when the adapter is disabled", async () => {
  const result = await squareFetch("/v2/locations");
  assert.equal(result.enabled, false);
  if (!result.enabled) assert.equal(result.reason, "not_configured");
});

test("client sources never receive Square secrets", () => {
  const env = readFileSync(new URL("../.env.example", import.meta.url), "utf8");
  assert.match(env, /SQUARE_ACCESS_TOKEN=/);
  assert.doesNotMatch(env, /NEXT_PUBLIC_SQUARE/);
  for (const file of ["lib/square/config.ts", "app/layout.tsx", "components/experience/chrome.tsx"]) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /NEXT_PUBLIC_SQUARE/);
  }
});

test("webhook signatures match Square's published HMAC construction", () => {
  const body = '{"hello":"world"}';
  const notificationUrl = "https://example.com/webhook";
  const signatureKey = "asdf1234";
  const expected = "2kRE5qRU2tR+tBGlDwMEw2avJ7QM4ikPYD/PJ3bd9Og=";
  assert.equal(squareWebhookSignature(notificationUrl, body, signatureKey), expected);
  assert.equal(
    verifySquareWebhookSignature({
      signatureHeader: expected,
      body,
      signatureKey,
      notificationUrl,
    }),
    true,
  );
  assert.equal(
    verifySquareWebhookSignature({
      signatureHeader: "not-valid",
      body,
      signatureKey,
      notificationUrl,
    }),
    false,
  );
});

test("webhook routing and duplicate event IDs are durable", async () => {
  assert.equal(routeSquareWebhook("payment.created"), "payment");
  assert.equal(routeSquareWebhook("catalog.version.updated"), "ignored");
  const body = JSON.stringify({
    type: "customer.created",
    event_id: "evt_test_1",
    merchant_id: "ml_test",
    data: { type: "customer", id: "c_1" },
  });
  const event = parseSquareWebhookEvent(body);
  assert.ok(event);
  const first = await recordSquareWebhookEvent(db, event!, payloadDigest(body), "sandbox");
  const second = await recordSquareWebhookEvent(db, event!, payloadDigest(body), "sandbox");
  assert.equal(first, true);
  assert.equal(second, false);
});

test("Square mappings persist explicit IDs, not names", async () => {
  await mapUserToSquareCustomer(db, "preview-client", "sqc_123", "sandbox");
  await mapLocationToSquare(db, "eunice", "sqloc_eunice", "sandbox");
  await mapProviderToSquareTeam(db, "katie", "sqtm_katie", "sandbox");
  await mapCatalogObject(db, {
    internalId: "signature",
    internalKind: "service",
    squareId: "sqcat_sig",
    squareSecondaryId: "sqvar_sig",
    environment: "sandbox",
  });
  assert.equal((await squareCustomerForUser(db, "preview-client"))?.square_customer_id, "sqc_123");
  assert.equal((await squareLocationFor(db, "eunice"))?.square_location_id, "sqloc_eunice");
  assert.equal((await squareTeamMemberFor(db, "katie"))?.square_team_member_id, "sqtm_katie");
  assert.equal((await squareCatalogFor(db, "service", "signature"))?.square_variation_id, "sqvar_sig");
});

test("fulfillment intents map onto Square order types without inventing stock", () => {
  assert.deepEqual(
    [...fulfillmentIntents],
    ["in_location_take_home", "online_ship", "in_location_ship", "online_pickup", "location_fulfill"],
  );
  assert.equal(squareFulfillmentType("online_ship"), "SHIPMENT");
  assert.equal(squareFulfillmentType("online_pickup"), "PICKUP");
  assert.equal(squareFulfillmentType("in_location_take_home"), "PICKUP");
});
