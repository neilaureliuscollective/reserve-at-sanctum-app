import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Never use a hosted database or real client account in this synthetic suite.
if (process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NODE_ENV === 'production') throw Error('Run only against isolated local synthetic data.');
const origin = 'http://127.0.0.1:3021';
const artifacts = resolve('artifacts/fix-it-independent');
await mkdir(artifacts, { recursive: true });
const server = spawn(process.execPath, [resolve('node_modules/next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', '3021'], {
  cwd: resolve('apps/fix-it-shop'),
  env: { ...process.env, RESERVE_DEV_PREVIEW: 'true', APP_ORIGIN: origin },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '', browser;
server.stdout.on('data', d => { logs += d; });
server.stderr.on('data', d => { logs += d; });
try {
  await new Promise((resolveReady, reject) => {
    const timer = setTimeout(() => reject(Error('Server startup timed out')), 30000);
    server.stdout.on('data', d => { if (String(d).includes('Ready in')) { clearTimeout(timer); resolveReady(); } });
    server.on('error', reject);
    server.on('exit', code => { clearTimeout(timer); reject(Error('Server exited: ' + code)); });
  });
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(origin + '/');
  await page.waitForLoadState('networkidle');
  assert.match(await page.title(), /Fix It Shop/);
  assert.equal(await page.locator('link[rel="manifest"]').getAttribute('href'), '/fix-it-shop/booking.webmanifest');
  const manifest = await (await context.request.get(origin + '/fix-it-shop/booking.webmanifest')).json();
  assert.equal(manifest.name, 'Fix It Shop');
  assert.equal(manifest.id, '/'); assert.equal(manifest.start_url, '/'); assert.equal(manifest.scope, '/');
  const apple = await page.locator('link[rel="apple-touch-icon"]').evaluateAll(nodes => nodes.map(n => n.getAttribute('href')));
  assert.ok(apple.length && apple.every(url => url.includes('/fix-it-shop/')));
  for (const size of [180, 192, 512]) assert.equal((await context.request.get(origin + '/fix-it-shop/app/icons/' + size + '.png')).status(), 200);
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Customer layout overflow at ' + width);
  }
  assert.equal((await context.request.post(origin + '/api/auth', { headers: { Origin: origin }, data: { action: 'preview', identity: 'preview-katie' } })).status(), 200);
  await page.goto(origin + '/'); await page.waitForLoadState('networkidle');
  assert.match(page.url(), /\/studio\/today/);
  assert.match(await page.title(), /Fix It Shop/);
  assert.ok(await page.locator('.fix-it-studio').count());
  await page.screenshot({ path: artifacts + '/katie-today.png', fullPage: true });
  for (const path of ['/studio/clients', '/studio/schedule']) {
    await page.goto(origin + path); await page.waitForLoadState('networkidle');
    assert.ok(await page.locator('.fix-it-studio').count(), path);
  }
  assert.equal((await context.request.get(origin + '/studio/commerce')).status(), 404);
  await page.goto(origin + '/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.goto(origin + '/studio/today');
  assert.match(await page.locator('body').innerText(), /offline|reconnect/i);
  assert.equal(await page.locator('.provider-day').count(), 0, 'Private day must not be cached');
  await context.setOffline(false);
  assert.deepEqual(errors, []);
  console.log('Independent identity, mobile layout, Katie launch, private routes, and offline privacy checks passed.');
} finally {
  await browser?.close(); server.kill('SIGTERM');
  await writeFile(artifacts + '/server.log', logs);
}
