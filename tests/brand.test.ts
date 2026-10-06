import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { brand, locationLabel } from "../lib/brand";
import { commerceStatus, productConcepts } from "../lib/commerce";
import { locationDisplayName, primaryLocation } from "../lib/experience/locations";

test("public identity is Legacy Reserve", () => {
  assert.equal(brand.name, "Legacy Reserve");
  assert.equal(brand.shortName, "Legacy Reserve");
  assert.match(brand.description, /men/i);
  assert.doesNotMatch(brand.description, /barber|unisex|salon website/i);
  assert.equal(locationLabel("Eunice"), "Legacy Reserve — Eunice");
  assert.equal(locationDisplayName("eunice"), "Legacy Reserve — Eunice");
  assert.equal(primaryLocation.id, "eunice");
  assert.equal(primaryLocation.status, "operating");
});

test("commerce remains a hook, not a rebuilt shop", () => {
  const status = commerceStatus();
  assert.equal(status.checkout, false);
  assert.equal(status.products.length, productConcepts.length);
  assert.ok(productConcepts.every((item) => item.alt.includes("Legacy Reserve")));
});

test("customer metadata and manifest no longer use Reserve at Sanctum", () => {
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const manifest = readFileSync(new URL("../app/manifest.ts", import.meta.url), "utf8");
  const chrome = readFileSync(new URL("../components/experience/chrome.tsx", import.meta.url), "utf8");
  for (const source of [layout, manifest, chrome]) {
    assert.doesNotMatch(source, /The Reserve at Sanctum/);
    assert.doesNotMatch(source, /THE RESERVE AT SANCTUM/);
    assert.match(source, /Legacy Reserve|brand\./);
  }
});
