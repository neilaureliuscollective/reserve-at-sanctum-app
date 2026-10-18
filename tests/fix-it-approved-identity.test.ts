import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";

test("approved identity originals retain exact supplied hashes and opaque square geometry", async () => {
  for (const [name, expected] of Object.entries({
    "full-logo.png": "c8f5c125f3529761a8a4303a4fddca9d30d2b2f7179286d1e81fec723c56366c",
    "app-icon.png": "97a168d3bc0983a2e3fc37879b7f771f702299ea665a3055ebe7a2403192f9b7",
  })) {
    const bytes = await readFile(`assets/approved/fix-it-shop/${name}`);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), expected);
    const meta = await sharp(bytes).metadata();
    assert.equal(meta.width, 1254); assert.equal(meta.height, 1254); assert.equal(meta.hasAlpha, false);
  }
});
test("derived icon exports are opaque, correctly sized, and match installed root/Katie assets", async () => {
  for (const size of [16, 32, 48, 180, 192, 512]) {
    const bytes = await readFile(`public/fix-it-shop-app/identity/${size < 180 ? "favicon" : "icon"}-${size}.png`);
    const meta = await sharp(bytes).metadata();
    assert.equal(meta.width, size); assert.equal(meta.height, size); assert.equal(meta.hasAlpha, false);
    if (size >= 180) assert.deepEqual(await readFile(`public/fix-it-shop/app/icons/${size}.png`), bytes);
    if (size === 180) assert.deepEqual(await readFile("app/apple-icon.png"), bytes);
    if (size === 192) assert.deepEqual(await readFile("app/icon.png"), bytes);
  }
});
test("maskable keeps all gold identity pixels inside its central 40 percent radius with opaque margins", async () => {
  const { data, info } = await sharp("public/fix-it-shop-app/identity/icon-512-maskable.png").raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 512); assert.equal(info.height, 512); assert.equal(info.channels, 3);
  let furthest = 0, goldPixels = 0;
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const at = (y * 512 + x) * 3, [r, g, b] = data.subarray(at, at + 3);
    if (r > g * 1.08 && g > b * 1.35 && g > 85) { furthest = Math.max(furthest, Math.hypot(x - 255.5, y - 255.5)); goldPixels++; }
  }
  assert.ok(goldPixels > 10000); assert.ok(furthest < 512 * .4 - 8, `Gold radius ${furthest} exceeds safe margin`);
  assert.deepEqual(await readFile("public/fix-it-shop/app/icons/512-maskable.png"), await readFile("public/fix-it-shop-app/identity/icon-512-maskable.png"));
});
