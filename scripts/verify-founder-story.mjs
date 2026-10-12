import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const base=process.env.FOUNDER_VERIFY_ORIGIN || 'http://127.0.0.1:3131';
await mkdir('artifacts/founder-story',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[];
try {
 const context=await browser.newContext(); const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 for(const [width,height] of [[320,660],[390,844],[540,720],[768,1024],[884,900],[1440,1000]]) {
  await page.setViewportSize({width,height});await page.goto(base+'/fix-it-shop/app/founder');await page.locator('#founder-title').waitFor();await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('main h1').count(),1);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow ${width}`);
  await page.screenshot({path:`artifacts/founder-story/hero-${width}.png`});
  for(const id of ['the-name','the-standard','service','invitation']) {await page.locator('#'+id).scrollIntoViewIfNeeded();await page.waitForTimeout(850);await page.screenshot({path:`artifacts/founder-story/${id}-${width}.png`});}
  assert.equal(await page.locator('main a[href="/fix-it-shop/app/book"]').count(),1);
  await page.locator('main a[href="/fix-it-shop/app/book"]').click();await page.waitForURL('**/fix-it-shop/app/book');assert.ok(await page.locator('main').isVisible());
  await page.goto(base+'/fix-it-shop/app');await page.locator('#katie').scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/founder-story/home-${width}.png`});
  await page.getByRole('link',{name:'Discover Her Story'}).click();await page.waitForURL('**/founder');
 }
 await page.getByRole('button',{name:'Still view',exact:true}).click();assert.equal(await page.locator('main').getAttribute('data-still'),'true');
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.getByRole('button',{name:'Motion off',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Motion off',exact:true}).isDisabled(),true);
 await page.getByRole('navigation',{name:'Founder story chapters'}).getByRole('link',{name:'02 The name'}).focus();await page.keyboard.press('Enter');assert.ok(page.url().endsWith('#the-name'));
 const schema=await page.locator('script[type="application/ld+json"]').textContent();assert.equal(JSON.parse(schema).mainEntity.name,'Katie Guidry');
 assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),new URL('/fix-it-shop/app/founder',process.env.FOUNDER_CANONICAL_ORIGIN || base).href);
 const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const staticPage=await nojs.newPage();await staticPage.goto(base+'/fix-it-shop/app/founder');assert.equal(await staticPage.locator('main section').count(),5);assert.ok((await staticPage.locator('#the-name').innerText()).includes('passed down to Katie')); 
 await staticPage.locator('#the-name').scrollIntoViewIfNeeded();await staticPage.screenshot({path:'artifacts/founder-story/no-js.png'});await nojs.close();
 assert.deepEqual(errors,[]);console.log('PASS: 6 viewports; no overflow; homepage story navigation; booking handoff; chapter keyboard controls; reduced/manual motion; no-JS content; metadata/schema; zero browser errors.');
} finally {await browser.close();}
