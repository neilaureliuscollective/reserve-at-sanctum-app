import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

// Run against an isolated development server with synthetic preview identities.
const base = process.env.VERIFY_APP_BASE || 'http://localhost:3100';
assert.ok(/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base), 'Local synthetic review only');
await mkdir('artifacts/app-materials', { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const results = [];
try {
  for (const identity of ['preview-client', 'preview-neil', 'preview-katie']) {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const login = await context.request.post(base + '/api/auth', { headers: { Origin: base }, data: { action: 'preview', identity } });
    assert.equal(login.status(), 200, await login.text());
    const routes = identity === 'preview-client'
      ? ['/home', '/pathways', '/vitalis', '/vitalis/journey', '/concierge', '/visit', '/shop', '/account', '/profile', '/membership', '/my-reserve', '/chair']
      : identity === 'preview-neil'
        ? ['/home', '/studio/schedule', '/studio/content', '/studio/build', '/studio/clients', '/studio/memberships', '/studio/vitalis', '/studio/commerce', '/studio/operations', '/studio/brands']
        : ['/studio', '/fix-it-shop/app'];
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      for (const route of routes) {
        let response;
        try { response = await page.goto(base + route, { waitUntil: 'domcontentloaded' }); }
        catch (error) {
          if (!String(error).includes('ERR_ABORTED')) throw error;
          response = await page.goto(base + route, { waitUntil: 'domcontentloaded' });
        }
        assert.ok(response.status() < 400, `${identity} ${route}: ${response.status()}`);
        await page.locator('main h1:visible, main h2:visible').first().waitFor();
        const info = await page.evaluate(() => {
          const theme = document.querySelector('.legacy-app-theme');
          const canvas = document.querySelector('.studio-shell') || document.querySelector('.reserve-app-shell');
          return { themed: Boolean(theme), canvas: canvas && getComputedStyle(canvas).backgroundColor, overflow: document.documentElement.scrollWidth > innerWidth, heading: document.querySelector('main h1')?.textContent, fields: [...document.querySelectorAll('main input:not([type=hidden]),main textarea,main select')].slice(0, 4).map(el => ({ color: getComputedStyle(el).color, background: getComputedStyle(el).backgroundColor })) };
        });
        assert.equal(info.themed, identity !== 'preview-katie', `Theme boundary ${identity} ${route}`);
        if (info.themed) assert.equal(info.canvas, 'rgb(245, 241, 232)', `Ivory canvas ${identity} ${route}`);
        if (info.themed && (route === '/home')) {
          const feature = page.locator(identity === 'preview-neil' ? '.command-center' : '.member-priority-stage');
          const colors = await feature.evaluate(el => ({ background: getComputedStyle(el).backgroundImage, foreground: getComputedStyle(el.querySelector('h2')).color }));
          assert.ok(colors.background.includes('rgb(38, 49, 44)'), `Steel feature ${identity}`);
          assert.equal(colors.foreground, 'rgb(245, 241, 232)', `Ivory feature heading ${identity}`);
        }
        assert.equal(info.overflow, false, `Horizontal overflow ${identity} ${route} ${width}`);
        await page.screenshot({ path: `artifacts/app-materials/${identity}-${route.replace(/\W/g, '-')}-${width}.png`, fullPage: true });
        results.push({ identity, route, width, ...info });
        console.log(`PASS ${identity} ${route} ${width}`);
      }
    }
    assert.deepEqual(errors, [], `${identity} browser exceptions`);
    await context.close();
  }
  await writeFile('artifacts/app-materials/results.json', JSON.stringify(results, null, 2));
} finally { await browser.close(); }
