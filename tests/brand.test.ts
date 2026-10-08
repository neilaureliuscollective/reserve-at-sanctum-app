import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { brand, locationLabel } from "../lib/brand";
import { commerceStatus, productConcepts } from "../lib/commerce";
import {
  locationDisplayName,
  primaryLocation,
} from "../lib/experience/locations";

test("public identity is Legacy Reserve", () => {
  assert.equal(brand.name, "Legacy Reserve");
  assert.equal(brand.shortName, "Legacy Reserve");
  assert.match(brand.description, /lifestyle ecosystem/i);
  assert.doesNotMatch(brand.description, /barber|unisex|salon website/i);
  assert.equal(locationLabel("Eunice"), "Legacy Reserve Sanctum — Eunice");
  assert.equal(
    locationDisplayName("eunice"),
    "Legacy Reserve Sanctum — Eunice",
  );
  assert.equal(primaryLocation.id, "eunice");
  assert.equal(primaryLocation.status, "planned");
});

test("commerce remains a Square hook, not live inventory", () => {
  const status = commerceStatus();
  assert.equal(status.source, "square");
  assert.equal(status.checkout, false);
  assert.equal(status.connected, false);
  assert.equal(status.products.length, 0);
  assert.equal(status.concepts.length, productConcepts.length);
  assert.ok(
    productConcepts.every((item) => item.alt.includes("Legacy Reserve")),
  );
});

test("official seal drives installable and in-app marks", () => {
  assert.match(brand.mark, /legacy-reserve/);
  assert.match(brand.ceremonial, /official-seal/);
  assert.match(brand.appIcon192, /app-icon-192/);
  for (const file of [
    "public/brand/legacy-reserve/official-seal.png",
    "public/brand/legacy-reserve/official-seal.webp",
    "public/brand/legacy-reserve/app-icon-180.png",
    "public/brand/legacy-reserve/app-icon-192.png",
    "public/brand/legacy-reserve/app-icon-512.png",
    "public/brand/legacy-reserve/app-icon-maskable-512.png",
    "app/icon.png",
    "app/apple-icon.png",
    "public/favicon.ico",
  ]) {
    assert.equal(
      existsSync(new URL(`../${file}`, import.meta.url)),
      true,
      file,
    );
  }
});

test("customer metadata and manifest no longer use Reserve at Sanctum", () => {
  const layout = readFileSync(
    new URL("../app/layout.tsx", import.meta.url),
    "utf8",
  );
  const manifest = readFileSync(
    new URL("../app/manifest.ts", import.meta.url),
    "utf8",
  );
  const chrome = readFileSync(
    new URL("../components/experience/chrome.tsx", import.meta.url),
    "utf8",
  );
  for (const source of [layout, manifest, chrome]) {
    assert.doesNotMatch(source, /The Reserve at Sanctum/);
    assert.doesNotMatch(source, /THE RESERVE AT SANCTUM/);
    assert.match(source, /Legacy Reserve|brand\./);
  }
  assert.match(layout, /brand\.themeColor|themeColor: brand/);
  assert.match(manifest, /brand\.appIcon192/);
  assert.match(manifest, /brand\.appIconMaskable/);
  assert.equal(brand.themeColor, "#0B1610");
  assert.doesNotMatch(brand.themeColor, /#12373A|#0[Bb]1[Ff]2/i);
});
