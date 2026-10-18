import { chromium } from "@playwright/test";
import sharp from "sharp";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { parseArgs } from "node:util";
import assert from "node:assert/strict";

// Reproducible static browser proof. Material masks contain actual isolated
// ribbon/hardware/button/frame paint, not broad rectangles over the blue scene.
const { values } = parseArgs({ options: {
  phase: { type: "string" }, "artifacts-dir": { type: "string" },
  "baseline-dir": { type: "string" }, "public-dir": { type: "string", default: "public" },
} });
assert.ok(["before", "after", "inspect"].includes(values.phase));
const output = resolve(values["artifacts-dir"]), publicDir = resolve(values["public-dir"]);
const baselineDir = values["baseline-dir"] && resolve(values["baseline-dir"]);
if (values.phase === "after") assert.ok(baselineDir);
await mkdir(output + "/masks", { recursive: true });
const types = { ".html": "text/html", ".css": "text/css", ".mjs": "text/javascript", ".js": "text/javascript", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2" };
const server = createServer(async (req, res) => {
  const file = resolve(publicDir, "." + new URL(req.url, "http://local").pathname);
  if (!file.startsWith(publicDir + sep)) { res.writeHead(403).end(); return; }
  try { const bytes = await readFile(file); res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" }).end(bytes); }
  catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = "http://127.0.0.1:" + server.address().port;
let browser;
const captures = [], contrast = [], controls = [], states = [], goldBands = [], errors = [];
const settled = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const rgb = text => text.match(/[\d.]+/g).slice(0, 3).map(Number);
const luminance = color => color.map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
const ratio = (a, b) => { const [low, high] = [luminance(a), luminance(b)].sort((a, b) => a - b); return (high + .05) / (low + .05); };
async function pixels(buffer) { return sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); }
async function show(page, screen) {
  await page.evaluate(screen => { location.hash = "#" + screen; }, screen);
  await page.waitForFunction(screen => !document.querySelector(`[data-screen="${screen}"]`).hidden, screen);
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].filter(img => img.getClientRects().length).map(img => img.decode())); scrollTo(0, 0); });
  await settled(page);
}
async function metadata(page) {
  return page.evaluate(() => {
    const strip = value => value.replace(/rgba?\([^)]*\)/g, "COLOR").replaceAll(location.origin, "<origin>");
    const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y + scrollY, width: r.width, height: r.height }; };
    const geometry = [...document.querySelectorAll("h1,h2,p,a,button,label,textarea,summary,.stage-ribbon,.expanded-booking,.consultation-entry,.card-pane")].filter(e => e.getClientRects().length).map(e => {
      const s = getComputedStyle(e);
      return { tag: e.tagName, id: e.id, text: e.textContent.trim().slice(0, 80), ...rect(e), font: s.font, letterSpacing: s.letterSpacing, padding: s.padding, borderWidth: s.borderWidth, radius: s.borderRadius, shadowGeometry: strip(s.boxShadow), transform: s.transform };
    });
    const protectedStyles = [];
    for (const selector of ["#fix-it-pocket", ".stage-material", ".stage-material img", ".path-material", ".path-material img", ".stage-shade", ".story-path::after", ".consultation-entry", ".card-pane", ".app-header", ".app-nav a[aria-current=page]"]) {
      const pseudo = selector.endsWith("::after") ? "::after" : null;
      for (const element of document.querySelectorAll(selector.replace("::after", ""))) {
        const s = getComputedStyle(element, pseudo);
        protectedStyles.push({ selector, background: s.background.replaceAll(location.origin, "<origin>"), filter: s.filter, opacity: s.opacity, blend: s.backgroundBlendMode, mixBlend: s.mixBlendMode, objectFit: s.objectFit, objectPosition: s.objectPosition });
      }
    }
    const bar = document.querySelector(".app-header").getBoundingClientRect();
    const selected = document.querySelector('.app-nav a[aria-current="page"]');
    return { geometry, protectedStyles, headerEdge: { x: bar.x, y: bar.bottom - 1 + scrollY, width: bar.width, height: 1 }, selected: selected ? { ...rect(selected), radius: parseFloat(getComputedStyle(selected).borderRadius) } : null, scroll: scrollY };
  });
}
const groups = {
  ribbon: { selector: ".stage-ribbon", after: true },
  navigation: { selector: ".app-nav" },
  shelf: { selector: ".expanded-booking" },
  gold: { selector: ":is(.stage-booking,.expanded-booking,.card-pane) .primary" },
  frames: { selector: ".consultation-entry,.card-pane", frame: true },
};
async function capture(page, name, fullPage = false) {
  const meta = await metadata(page);
  const normal = await page.screenshot({ fullPage, animations: "disabled", caret: "hide" });
  await writeFile(output + "/" + name + ".png", normal);
  const { data, info } = await pixels(normal), mask = new Uint8Array(info.width * info.height);
  const counts = {};
  for (const [key, group] of Object.entries(groups)) {
    const visible = await page.locator(group.selector).evaluateAll(nodes => nodes.some(node => node.getClientRects().length));
    if (!visible) continue;
    const style = await page.addStyleTag({ content:
      "html,body{background:transparent!important}*,*::before,*::after{visibility:hidden!important;color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important}" +
      group.selector + "{visibility:visible!important}" + (group.after ? group.selector + "::after{visibility:visible!important}" : "") +
      (group.frame ? group.selector + "{background:none!important}" : "") });
    const isolated = await page.screenshot({ fullPage, omitBackground: true, animations: "disabled", caret: "hide" });
    await style.evaluate(element => element.remove());
    const raw = await pixels(isolated); assert.equal(raw.info.width, info.width); assert.equal(raw.info.height, info.height);
    let count = 0;
    for (let index = 0; index < mask.length; index++) if (raw.data[index * 4 + 3]) { mask[index] = 255; count++; }
    counts[key] = count;
    await writeFile(output + `/masks/${name}-${key}.png`, isolated);
  }
  const edge = meta.headerEdge;
  const paintOffset = fullPage ? 0 : meta.scroll;
  for (let y = Math.max(0, Math.floor(edge.y - paintOffset)); y < Math.min(info.height, Math.ceil(edge.y - paintOffset + edge.height)); y++)
    for (let x = Math.max(0, Math.floor(edge.x)); x < Math.min(info.width, Math.ceil(edge.x + edge.width)); x++) mask[y * info.width + x] = 255;
  // The selected tile's blue inset is protected even inside the navigation mask.
  // A 3px inset excludes only its existing border/rounded antialiasing edge.
  const selected = meta.selected;
  if (selected) {
    const x0 = selected.x + 3, y0 = selected.y - paintOffset + 3, x1 = selected.x + selected.width - 3, y1 = selected.y - paintOffset + selected.height - 3, radius = Math.max(0, selected.radius - 3);
    for (let y = Math.max(0, Math.ceil(y0)); y < Math.min(info.height, y1); y++) for (let x = Math.max(0, Math.ceil(x0)); x < Math.min(info.width, x1); x++) {
      const cx = Math.max(x0 + radius, Math.min(x1 - radius, x + .5)), cy = Math.max(y0 + radius, Math.min(y1 - radius, y + .5));
      if ((x + .5 - cx) ** 2 + (y + .5 - cy) ** 2 <= radius ** 2) mask[y * info.width + x] = 0;
    }
  }
  await sharp(mask, { raw: { width: info.width, height: info.height, channels: 1 } }).png().toFile(output + `/masks/${name}-allowed.png`);
  const result = { name, width: info.width, height: info.height, fullPage, counts, maskedPixels: mask.filter(v => v).length, ...meta };
  assert.ok(result.maskedPixels < mask.length * .75, `Mask unexpectedly covers most of ${name}`);
  if (baselineDir) {
    const oldMeta = JSON.parse(await readFile(baselineDir + "/captures.json", "utf8")).find(item => item.name === name);
    assert.deepEqual(result.geometry, oldMeta.geometry, `Changed geometry/type/shadow extents at ${name}`);
    assert.deepEqual(result.protectedStyles, oldMeta.protectedStyles, `Changed protected blue/crop/style at ${name}`);
    const old = await pixels(await readFile(baselineDir + "/" + name + ".png"));
    const oldMask = await sharp(baselineDir + `/masks/${name}-allowed.png`).greyscale().raw().toBuffer();
    assert.equal(old.info.width, info.width); assert.equal(old.info.height, info.height);
    let changed = 0, outside = 0; const firstOutside = [];
    const diff = Buffer.alloc(mask.length * 3);
    for (let index = 0; index < mask.length; index++) {
      const offset = index * 4;
      if (!data.subarray(offset, offset + 4).equals(old.data.subarray(offset, offset + 4))) {
        changed++; const allowed = mask[index] || oldMask[index];
        if (!allowed) { outside++; if (firstOutside.length < 8) firstOutside.push({ x: index % info.width, y: Math.floor(index / info.width) }); }
        diff[index * 3] = allowed ? 70 : 255; diff[index * 3 + 1] = allowed ? 150 : 0; diff[index * 3 + 2] = allowed ? 180 : 0;
      }
    }
    result.pixelDiff = { changed, outsideAllowed: outside, firstOutside };
    await sharp(diff, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toFile(output + `/masks/${name}-diff.png`);
    captures.push(result);
    assert.equal(outside, 0, `Protected pixels changed outside explicit paint masks at ${name}: ${JSON.stringify(firstOutside)}`);
  } else captures.push(result);
}
async function textContrast(page, name) {
  const text = await page.evaluate(() => {
    window.__materialTextParents = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), out = []; let node;
    while (node = walker.nextNode()) {
      const element = node.parentElement;
      if (!node.textContent.trim() || !element || element.closest('[disabled],[aria-disabled="true"]')) continue;
      const s = getComputedStyle(element); if (s.visibility === "hidden" || s.display === "none") continue;
      let brightness = 1;
      for (let p = element; p; p = p.parentElement) { const value = getComputedStyle(p).filter.match(/brightness\(([\d.]+)\)/); if (value) brightness *= Number(value[1]); }
      const ref = window.__materialTextParents.push(element) - 1, range = document.createRange(); range.selectNodeContents(node);
      for (const r of range.getClientRects()) if (r.width && r.height && r.top >= 0 && r.bottom <= innerHeight)
        out.push({ ref, text: node.textContent.trim(), color: s.color, brightness, size: parseFloat(s.fontSize), weight: parseFloat(s.fontWeight) || 400, x: r.x, y: r.y, width: r.width, height: r.height, caption: !!element.closest(':is(.stage-booking,.expanded-booking,.card-pane) .primary small') });
    }
    return out;
  });
  const hide = await page.addStyleTag({ content: "*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important}" });
  const image = await pixels(await page.screenshot({ animations: "disabled", caret: "hide" })); await hide.evaluate(element => element.remove());
  for (const t of text) {
    const points = [];
    for (let y = Math.max(0, Math.ceil(t.y + 1)); y < Math.min(image.info.height, t.y + t.height - 1); y += 2)
      for (let x = Math.max(0, Math.ceil(t.x + 1)); x < Math.min(image.info.width, t.x + t.width - 1); x += 2) points.push([x, y]);
    const visible = await page.evaluate(({ points, ref }) => points.map(([x, y]) => { const hit = document.elementFromPoint(x, y), element = window.__materialTextParents[ref]; return hit && (hit === element || element.contains(hit)); }), { points, ref: t.ref });
    let minimum = Infinity, samples = 0; const foreground = rgb(t.color).map(value => Math.min(255, value * t.brightness));
    points.forEach(([x, y], index) => { if (visible[index]) { const at = (y * image.info.width + x) * 4; minimum = Math.min(minimum, ratio(foreground, [...image.data.subarray(at, at + 3)])); samples++; } });
    if (samples) { const threshold = t.size >= 24 || t.size >= 18.66 && t.weight >= 700 ? 3 : 4.5; contrast.push({ name, text: t.text, caption: t.caption, minimum: Number(minimum.toFixed(3)), threshold, samples }); }
  }
}
async function pseudo(page, element, states) {
  await element.evaluate(node => node.dataset.materialPseudoTarget = "yes");
  const cdp = await page.context().newCDPSession(page); await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
  const { root } = await cdp.send("DOM.getDocument");
  const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: '[data-material-pseudo-target="yes"]' });
  await cdp.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: states });
  return async () => { await cdp.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: [] }); await cdp.detach(); await element.evaluate(node => delete node.dataset.materialPseudoTarget); };
}
async function controlContrast() {
  for (const state of states) {
    const image = await pixels(await readFile(output + "/" + state.name + ".png"));
    const at = (pixels, x, y) => {
      const offset = (Math.floor(y) * pixels.info.width + Math.floor(x)) * 4;
      assert.ok(x >= 0 && y >= 0 && x < pixels.info.width && y < pixels.info.height);
      return [...pixels.data.subarray(offset, offset + 3)];
    };
    const middle = state.y + state.height / 2;
    const navigation = state.name.startsWith("navigation-");
    const face = at(image, state.x + (navigation ? 0 : 10), middle);
    const adjacent = at(image, state.x - (navigation ? 3 : 10), middle);
    controls.push({ name: state.name, kind: navigation ? "selected gold border / steel surround" : "gold face / surround", foreground: face, background: adjacent, contrast: Number(ratio(face, adjacent).toFixed(3)) });
    if (state.name.endsWith("-focus")) {
      const normal = await pixels(await readFile(output + "/" + state.name.replace(/-focus$/, "-normal") + ".png"));
      const distance = parseFloat(state.outlineOffset) + parseFloat(state.outlineWidth) / 2;
      for (const [edge, x, y] of [["left", state.x - distance, middle], ["right", state.x + state.width + distance, middle], ["top", state.x + state.width / 2, state.y - distance], ["bottom", state.x + state.width / 2, state.y + state.height + distance]]) {
        const foreground = at(image, x, y), background = at(normal, x, y), expected = rgb(state.outlineColor);
        assert.ok(foreground.every((value, index) => Math.abs(value - expected[index]) <= 2), `Focus ring sample is not actual outline paint at ${state.name}/${edge}`);
        controls.push({ name: state.name, kind: "focus ring " + edge, foreground, background, contrast: Number(ratio(foreground, background).toFixed(3)) });
      }
    }
  }
}
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  for (const width of [390, 884]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, reducedMotion: "reduce", locale: "en-US", timezoneId: "UTC", serviceWorkers: "block" });
    await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage(); page.on("pageerror", error => errors.push(error.message));
    await page.goto(origin + "/fix-it-shop-app/index.html#home"); await page.mouse.move(width - 2, 2);
    for (const screen of ["home", "services", "card", "shop", "katie"]) {
      await show(page, screen); await capture(page, `${screen}-${width}-viewport`);
      if (screen === "home" || screen === "card" && width === 884) await capture(page, `${screen}-${width}-full`, true);
      await textContrast(page, `${screen}-${width}-normal`);
    }
    for (const target of ["gold", "navigation", ...(width === 884 ? ["save"] : [])]) {
      await show(page, target === "save" ? "card" : "home");
      const element = page.locator(target === "navigation" ? '.app-nav a[aria-current="page"]' : target === "save" ? '#card-form .primary' : width < 800 ? '.stage-booking .primary' : '.expanded-booking .primary');
      if (target === "save") { await element.evaluate(node => node.scrollIntoView({ block: "center", behavior: "instant" })); await settled(page); await capture(page, `card-save-${width}-viewport`); }
      for (const state of ["normal", "hover", "pressed", "focus"]) {
        const clear = await pseudo(page, element, state === "normal" ? [] : state === "pressed" ? ["hover", "active"] : state === "focus" ? ["focus-visible"] : ["hover"]);
        await settled(page); const name = `${target}-${width}-${state}`;
        const info = await element.evaluate(node => { const s = getComputedStyle(node), r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, radius: s.borderRadius, padding: s.padding, font: s.font, filter: s.filter, outlineColor: s.outlineColor, outlineWidth: s.outlineWidth, outlineOffset: s.outlineOffset, backgroundStructure: s.backgroundImage.replace(/rgba?\([^)]*\)/g, "COLOR").replaceAll(location.origin, "<origin>"), shadowGeometry: s.boxShadow.replace(/rgba?\([^)]*\)/g, "COLOR") }; });
        states.push({ name, ...info }); await textContrast(page, name);
        await page.screenshot({ path: output + "/" + name + ".png", animations: "disabled", caret: "hide" });
        if (target !== "navigation" && state === "normal") {
          const hide = await page.addStyleTag({ content: "*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}" });
          const blank = await pixels(await page.screenshot()); await hide.evaluate(node => node.remove());
          const bands = [];
          for (const [start, end] of [[info.y + 10, info.y + 19], [info.y + info.height - 21, info.y + info.height - 11]]) {
            const channels = [[], [], []];
            for (let y = Math.ceil(start); y < end; y++) for (let x = Math.ceil(info.x + 25); x < info.x + info.width - 25; x++) { const at = (y * blank.info.width + x) * 4; channels.forEach((channel, index) => channel.push(blank.data[at + index])); }
            bands.push(channels.map(channel => channel.sort((a, b) => a - b)[Math.floor(channel.length / 2)]));
          }
          goldBands.push({ name, top: bands[0], bottom: bands[1] });
        }
        await clear();
      }
    }
    await context.close();
    const detail = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2, reducedMotion: "reduce", serviceWorkers: "block" });
    await detail.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page2 = await detail.newPage(); await page2.goto(origin + "/fix-it-shop-app/index.html#home"); await show(page2, "home"); await page2.mouse.move(width - 2, 2);
    const box = await page2.locator(width < 800 ? '.stage-booking .primary' : '.expanded-booking .primary').boundingBox();
    await page2.screenshot({ path: output + `/gold-cta-${width}-2x.png`, clip: { x: box.x - 8, y: box.y - 8, width: box.width + 16, height: box.height + 30 }, animations: "disabled", caret: "hide" });
    await detail.close();
  }
  if (baselineDir) assert.deepEqual(states, JSON.parse(await readFile(baselineDir + "/states.json", "utf8")), "Button/state geometry, gradient stop positions, reflection layout or focus style changed");
  await controlContrast();
  assert.deepEqual(errors, []);
  if (values.phase !== "before") {
    assert.deepEqual(contrast.filter(item => item.minimum < item.threshold), [], "Text contrast failed over actual composites");
    assert.ok(contrast.filter(item => item.caption).every(item => item.minimum >= 5), "Small gold captions should retain 5:1 headroom");
    assert.deepEqual(controls.filter(item => item.contrast < 3), [], "Control/focus contrast failed over actual composites");
  }
  console.log(JSON.stringify({ phase: values.phase, captures: captures.length, pixelComparisons: baselineDir ? captures.length : 0, changedOutsideMasks: baselineDir ? captures.reduce((sum, item) => sum + item.pixelDiff.outsideAllowed, 0) : null, textSamples: contrast.length, contrastFailures: contrast.filter(item => item.minimum < item.threshold), captionMinimum: Math.min(...contrast.filter(item => item.caption).map(item => item.minimum)), controls: controls.length, controlMinimum: Math.min(...controls.map(item => item.contrast)), goldBands }, null, 2));
} catch (error) { errors.push(String(error)); throw error; }
finally {
  await writeFile(output + "/captures.json", JSON.stringify(captures, null, 2));
  await writeFile(output + "/states.json", JSON.stringify(states, null, 2));
  await writeFile(output + "/contrast.json", JSON.stringify(contrast, null, 2));
  await writeFile(output + "/controls.json", JSON.stringify(controls, null, 2));
  await writeFile(output + "/summary.json", JSON.stringify({ phase: values.phase, errors, goldBands }, null, 2));
  await browser?.close(); await new Promise(resolve => server.close(resolve));
}
