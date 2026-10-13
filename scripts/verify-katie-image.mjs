import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Run against a local server. Baseline mode records the old crops without accepting them.
const origin = process.env.KATIE_IMAGE_ORIGIN || 'http://127.0.0.1:3100';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname), 'Local verification only');
const baseline = process.env.KATIE_IMAGE_BASELINE === 'true';
const phase = baseline ? 'before' : 'after';
const directory = `artifacts/katie-image/${phase}`;
await mkdir(directory, { recursive: true });
const assetPath = 'public/images/founder/katie-guidry.webp';
const source = await readFile(assetPath);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceHash = hash(source);
assert.equal(sourceHash, '73c26021fa17a2777a9024abb95ae17cc6f568706d03a7127441bbee2cfd6c28', 'Approved repository image must stay byte-identical');
await copyFile(assetPath, `${directory}/katie-guidry-source.webp`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const evidence = { phase, sourceHash, sourceBytes: source.length, viewports: [] };
const errors = [];
try {
  for (const [width, height, deviceScaleFactor] of [[320, 660, 3], [390, 844, 3], [540, 720, 2], [768, 1024, 2], [884, 900, 2], [1440, 1000, 1], [1920, 1080, 1]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    for (const [name, route] of [['home', '/'], ['founder', '/fix-it-shop/app/founder']]) {
      const response = await page.goto(origin + route);
      assert.equal(response.status(), 200);
      if (name === 'home') await page.waitForURL('**/fix-it-shop/app');
      await page.evaluate(() => document.fonts.ready);
      const picture = page.locator('#katie [data-photograph="true"]');
      const img = picture.locator('img');
      await img.scrollIntoViewIfNeeded();
      await img.evaluate(el => el.decode());
      const metrics = await img.evaluate(el => {
        const box = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        const frame = el.parentElement;
        const frameBox = frame.getBoundingClientRect();
        const pseudo = getComputedStyle(frame, '::after');
        const sourceRatio = 1280 / 720;
        const boxRatio = box.width / box.height;
        const visibleFraction = style.objectFit === 'cover' ? Math.min(boxRatio / sourceRatio, sourceRatio / boxRatio) : 1;
        const rails = [...frame.querySelectorAll('span')].map(rail => {
          const r = rail.getBoundingClientRect();
          return { overlaps: r.left < box.right && r.right > box.left && r.top < box.bottom && r.bottom > box.top };
        });
        return { src: el.currentSrc, naturalWidth: el.naturalWidth, naturalHeight: el.naturalHeight, width: box.width, height: box.height, frameWidth: frameBox.width, frameHeight: frameBox.height, objectFit: style.objectFit, filter: style.filter, transform: style.transform, pseudoContent: pseudo.content, visibleFraction, rails, srcset: el.srcset, loading: el.loading, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
      });
      evidence.viewports.push({ name, viewportWidth: width, viewportHeight: height, deviceScaleFactor, ...metrics });
      assert.equal(metrics.overflow, false, `${name} overflow at ${width}`);
      if (!baseline) {
        assert.equal(new URL(metrics.src).pathname, '/images/founder/katie-guidry.webp');
        assert.equal(metrics.naturalWidth, 1280);
        assert.equal(metrics.naturalHeight, 720);
        assert.equal(metrics.srcset, '', 'No lossy optimizer derivatives');
        assert.ok(Math.abs(metrics.width / metrics.height - 1280 / 720) < 0.002, 'Natural source proportions');
        assert.ok(metrics.width <= 1280, 'Never enlarge beyond native width');
        assert.ok(metrics.frameWidth + 1 >= metrics.width && metrics.frameHeight + 1 >= metrics.height, 'Frame contains the full image');
        assert.equal(metrics.objectFit, 'contain');
        assert.equal(metrics.visibleFraction, 1);
        assert.equal(metrics.filter, 'none');
        assert.equal(metrics.transform, 'none');
        assert.ok(['none', 'normal'].includes(metrics.pseudoContent), 'No image veil');
        assert.ok(metrics.rails.every(rail => !rail.overlaps), 'Captions stay outside the composition');
        const delivered = await context.request.get(metrics.src);
        assert.equal(hash(await delivered.body()), sourceHash, 'Browser receives exact repository bytes');
      }
      await page.locator('#katie').screenshot({ path: `${directory}/${name}-${width}.png`, scale: 'css' });
      await img.screenshot({ path: `${directory}/${name}-image-${width}.png`, scale: 'css' });
      if (name === 'home') {
        await page.getByRole('link', { name: 'Discover Her Story' }).click();
        await page.waitForURL('**/fix-it-shop/app/founder');
      } else {
        await page.getByRole('link', { name: 'Find your time with Katie' }).click();
        await page.waitForURL('**/fix-it-shop/app/book');
        assert.ok(await page.locator('main').isVisible());
      }
    }
    await context.close();
  }
  if (!baseline) {
    for (const javaScriptEnabled of [true, false]) {
      const context = await browser.newContext({ javaScriptEnabled, reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      await page.goto(origin + '/fix-it-shop/app/founder');
      const root = javaScriptEnabled ? page.locator('main').filter({ has: page.locator('#founder-title') }) : page.locator('.founder-noscript');
      const img = root.locator('#katie [data-photograph="true"] img');
      await img.scrollIntoViewIfNeeded();
      await img.evaluate(el => el.decode());
      const box = await img.boundingBox();
      assert.ok(Math.abs(box.width / box.height - 1280 / 720) < 0.002);
      for (const id of ['the-name', 'the-standard', 'service', 'invitation']) assert.ok(await root.locator('#' + id).isVisible());
      if (javaScriptEnabled) assert.ok(await page.getByRole('button', { name: 'Motion off' }).isDisabled());
      await img.screenshot({ path: `${directory}/founder-${javaScriptEnabled ? 'reduced-motion' : 'no-js'}.png`, scale: 'css' });
      await context.close();
    }
  }
  assert.deepEqual(errors, []);
  console.log(`PASS: ${phase}; 7 phone/Fold/desktop viewports; homepage → founder → booking links; no overflow or browser errors${baseline ? '' : '; full source proportions, exact source bytes, no shading/zoom/overlay, reduced motion and no-JS'}.`);
} finally {
  await writeFile(`${directory}/metrics.json`, JSON.stringify({ ...evidence, errors }, null, 2));
  await browser.close();
}
