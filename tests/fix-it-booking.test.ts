import test from "node:test";
import assert from "node:assert/strict";
import {
  fixItManifest,
  fixItDestination,
  fixItBooking,
  accountEntranceFor,
} from "../lib/fix-it-booking";
import reserveManifest from "../app/manifest";
test("Fix It Shop has a stable distinct identity while existing root installation updates to the same business", () => {
  const fix = fixItManifest(),
    reserve = reserveManifest();
  assert.notEqual(fix.id, reserve.id);
  assert.equal(reserve.id, "/");
  assert.equal(reserve.scope, "/");
  assert.equal(reserve.name, "Fix It Shop");
  assert.equal(reserve.start_url, "/enter");
  assert.equal(fix.start_url, fixItBooking.base + "/launch");
  assert.ok(fix.icons?.some(i => i.purpose === "maskable"));
  assert.equal(fix.name, "Fix It Shop");
  assert.ok(fix.start_url?.startsWith(fix.scope!));
  assert.ok(fix.shortcuts?.every((s) => s.url.startsWith(fix.scope!)));
  assert.ok(fix.icons?.every((i) => i.src.startsWith("/fix-it-shop/")));
});
test("branded auth returns stay scoped and reject external or traversing destinations", () => {
  const target =
    fixItBooking.book + "?service=signature&start=2026-11-01T16%3A00%3A00Z";
  assert.equal(fixItDestination(target), target);
  assert.equal(
    fixItDestination(fixItBooking.base + "?from=home"),
    fixItBooking.base + "?from=home",
  );
  for (const path of [
    "https://evil.invalid",
    "//evil.invalid",
    "/studio",
    "/fix-it-shop/application",
    "/fix-it-shop/app/../../studio",
    "/fix-it-shop/app/%2e%2e/%2e%2e/studio",
  ])
    assert.equal(fixItDestination(path), fixItBooking.visits);
  assert.equal(
    accountEntranceFor(fixItDestination(target)),
    fixItBooking.signin,
  );
  assert.equal(accountEntranceFor("/account"), "/signin");
});
