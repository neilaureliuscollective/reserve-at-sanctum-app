import sharp from "sharp";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

// Deterministic exports only: no crop, redraw, transparency removal or AI.
const originals = "assets/approved/fix-it-shop";
const output = "public/fix-it-shop-app/identity";
const expected = {
  "full-logo.png": "c8f5c125f3529761a8a4303a4fddca9d30d2b2f7179286d1e81fec723c56366c",
  "app-icon.png": "97a168d3bc0983a2e3fc37879b7f771f702299ea665a3055ebe7a2403192f9b7",
};
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const png = { compressionLevel: 9, adaptiveFiltering: false, palette: false };
await mkdir(output, { recursive: true });
await mkdir("public/fix-it-shop/app/icons", { recursive: true });
for (const [name, hash] of Object.entries(expected)) {
  const bytes = await readFile(`${originals}/${name}`);
  assert.equal(sha(bytes), hash);
  const meta = await sharp(bytes).metadata();
  assert.equal(meta.width, 1254); assert.equal(meta.height, 1254);
  assert.equal(meta.hasAlpha, false);
}
const outputs = [];
async function save(name, bytes, size, role) {
  await writeFile(`${output}/${name}`, bytes);
  outputs.push({ path: `${output}/${name}`, size, role, bytes: bytes.length, sha256: sha(bytes) });
}
for (const size of [280, 560]) {
  const bytes = await sharp(`${originals}/full-logo.png`).resize(size, size, { kernel: "lanczos3", fit: "fill" }).webp({ lossless: true, effort: 6 }).toBuffer();
  await save(`full-logo-${size}.webp`, bytes, size, "uniform resize of complete opaque full logo");
}
for (const size of [16, 32, 48, 180, 192, 512]) {
  const bytes = await sharp(`${originals}/app-icon.png`).resize(size, size, { kernel: "lanczos3", fit: "fill" }).png(png).toBuffer();
  await save(`${size < 180 ? "favicon" : "icon"}-${size}.png`, bytes, size, "uniform resize of complete opaque app icon");
  if (size >= 180) await writeFile(`public/fix-it-shop/app/icons/${size}.png`, bytes);
}
// 448px of the unchanged square art is centered on an opaque 512px navy canvas.
// The outer gold ring stays inside the standard central 40%-radius safe circle.
const inset = await sharp(`${originals}/app-icon.png`).resize(448, 448, { kernel: "lanczos3", fit: "fill" }).png(png).toBuffer();
const maskable = await sharp({ create: { width: 512, height: 512, channels: 3, background: "#010d1a" } }).composite([{ input: inset, left: 32, top: 32 }]).removeAlpha().png(png).toBuffer();
await save("icon-512-maskable.png", maskable, 512, "complete original uniformly resized to 448; opaque 32px padding, no crop");
await writeFile("public/fix-it-shop/app/icons/512-maskable.png", maskable);
// ICO container embeds the exact opaque PNG derivatives without new processing.
const sizes = [16, 32, 48], images = await Promise.all(sizes.map(size => readFile(`${output}/favicon-${size}.png`)));
const header = Buffer.alloc(6 + sizes.length * 16); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
for (let index = 0; index < sizes.length; index++) {
  const at = 6 + index * 16; header[at] = sizes[index]; header[at + 1] = sizes[index];
  header.writeUInt16LE(1, at + 4); header.writeUInt16LE(24, at + 6);
  header.writeUInt32LE(images[index].length, at + 8); header.writeUInt32LE(offset, at + 12); offset += images[index].length;
}
const ico = Buffer.concat([header, ...images]);
await save("favicon.ico", ico, sizes, "ICO container of exact 16/32/48 PNG exports");
await writeFile("app/favicon.ico", ico);
await copyFile(`${output}/icon-192.png`, "app/icon.png");
await copyFile(`${output}/icon-180.png`, "app/apple-icon.png");
await writeFile(`${originals}/derivatives.json`, JSON.stringify({ sourceCommit: "a4cab5fcde22052cab12142c3c53d41b95b99aa9", originals: expected, engine: { sharp: sharp.versions.sharp, vips: sharp.versions.vips }, processing: "uniform Lanczos3 resizing; lossless RGB exports; maskable opaque padding only", outputs }, null, 2) + "\n");
console.log(`Verified both exact opaque originals; wrote ${outputs.length} deterministic identity exports.`);
