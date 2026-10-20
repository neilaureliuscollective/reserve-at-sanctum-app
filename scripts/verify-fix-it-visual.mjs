// Public-only regression check. Does not follow external booking or submit auth.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin=process.env.VISUAL_ORIGIN || 'http://localhost:3147';
const dir='artifacts/visual-pass';
await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
const results=[];
try {
 for(const width of [390,884,1440,320]) {
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  const page=await context.newPage();
  await page.goto(origin+'/fix-it-shop/app');
  await page.locator('.fis-brand-story').waitFor();
  assert.equal(await page.locator('img[src*="katie-guidry"]').count(),0);
  assert.equal(await page.locator('#katie a').getAttribute('href'),'/fix-it-shop/app/founder');
  assert.equal(await page.locator('.fix-it-book-action').getAttribute('href'),'https://fixitshop.glossgenius.com/');
  assert.equal(await page.locator('.fis-film').getAttribute('data-motion'),'false');
  await page.screenshot({path:`${dir}/after-home-${width}.png`});
  await page.locator('#katie').scrollIntoViewIfNeeded();
  await page.screenshot({path:`${dir}/after-brand-story-${width}.png`});
  await page.locator('#services').scrollIntoViewIfNeeded();
  await page.screenshot({path:`${dir}/after-services-${width}.png`});
  await page.locator('.fis-atmosphere button').nth(1).click();
  assert.equal(await page.locator('.fis-atmosphere button').nth(1).getAttribute('aria-pressed'),'true');
  for(const [name,path] of [['founder','/fix-it-shop/app/founder'],['guide','/fix-it-shop-app/index.html#guide'],['card','/fix-it-shop-app/index.html#card'],['location','/fix-it-shop-app/index.html#shop'],['visit','/fix-it-shop-app/index.html#visit'],['install','/fix-it-shop/app/install']]) {
   await page.goto(origin+path);await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${path} overflows at ${width}`);
   if(name==='founder') assert.equal(await page.locator('img[src="/images/founder/katie-guidry.webp"]').count(),1);
   await page.screenshot({path:`${dir}/after-${name}-${width}.png`});
  }
  await page.goto(origin+'/fix-it-shop-app/index.html#card');
  await page.locator('#change').fill('Synthetic visual check — keep the shape.');
  await page.getByRole('button',{name:'Save on this device',exact:true}).click();
  await page.reload();
  assert.equal(await page.locator('#change').inputValue(),'Synthetic visual check — keep the shape.');
  await page.locator('#show-link').click();
  await page.getByText('Synthetic visual check — keep the shape.',{exact:true}).waitFor();
  await page.screenshot({path:`${dir}/after-show-${width}.png`});
  await page.goto(origin+'/fix-it-shop-app/index.html#card');
  await page.locator('#delete-card').click();await page.locator('#cancel-delete').click();
  assert.equal(await page.locator('#change').inputValue(),'Synthetic visual check — keep the shape.');
  await page.locator('#delete-card').click();await page.locator('#confirm-delete').click();
  assert.equal(await page.locator('#change').inputValue(),'');
  await page.goto(origin+'/fix-it-shop/app');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement?.textContent?.trim()),'Skip to content');
  await page.screenshot({path:`${dir}/after-focus-${width}.png`});
  await page.keyboard.press('Enter');
  await page.locator('.fix-it-nav a').nth(1).click();
  await page.waitForURL('**/fix-it-shop/app#services');
  await page.locator('.fix-it-nav a').nth(2).click();
  await page.waitForURL('**/fix-it-shop-app/index.html#guide');
  results.push({width,portraitSeparation:true,bookingDestination:true,noHorizontalOverflow:true,cardSaveReloadShowCancelDelete:true,mobileNavigation:true,keyboardSkip:true,reducedMotion:true});
  await context.close();
 }
 // CSS zoom exercises enlarged layout and text; this is not physical-device/browser UI zoom.
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 for(const [name,path] of [['home','/fix-it-shop/app'],['founder','/fix-it-shop/app/founder'],['card','/fix-it-shop-app/index.html#card']]) {
  await page.goto(origin+path);await page.evaluate(()=>{document.documentElement.style.zoom='2';});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`${dir}/after-zoom200-${name}.png`});
 }
 const response=await page.request.get(origin+'/fix-it-shop/app/book',{maxRedirects:0});
 if ([307,308].includes(response.status())) assert.equal(response.headers().location,'https://fixitshop.glossgenius.com/');
 else {assert.equal(response.status(),200);assert.match(await response.text(),/<meta id="__next-page-redirect" http-equiv="refresh" content="1;url=https:\/\/fixitshop.glossgenius.com\/"/);}
 await fs.writeFile(`${dir}/browser-checks.json`,JSON.stringify({results,cssZoom200:true,bookingRedirect:true,externalBookingNeverOpened:true},null,2));
 console.log('Public visual checks passed at 390, 884, 1440, 320; CSS zoom 200%; booking redirect checked without following.');
} finally {await browser.close();}
