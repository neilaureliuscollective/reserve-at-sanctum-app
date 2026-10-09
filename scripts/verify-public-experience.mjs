import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
await mkdir('artifacts/public-experience',{recursive:true});
const port=process.env.VERIFY_PUBLIC_PORT || '3116';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',port],{env:{...process.env,RESERVE_DEV_PREVIEW:'false'},stdio:['ignore','pipe','pipe']});
let log='',browser;server.stdout.on('data',d=>log+=d);server.stderr.on('data',d=>log+=d);
const base=process.env.VERIFY_PUBLIC_BASE || `http://127.0.0.1:${port}`;
const widths=[[320,780],[360,800],[390,844],[390,660],[430,932],[600,900],[768,1024],[884,900],[1024,768],[1440,1000]];
try {
 await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('Ready in'))resolve()});server.on('exit',()=>reject(Error(log)));setTimeout(()=>reject(Error(log)),30000).unref()});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});await page.waitForURL('**/discover');assert.equal(new URL(page.url()).pathname,'/discover');
 for(const [width,height] of (process.env.VERIFY_PUBLIC_REMAINING==='true' ? [] : widths)){
  await page.setViewportSize({width,height});await page.goto(base+'/discover',{waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:'Built for Presence.'}).waitFor();
  assert.equal(await page.locator('.command-dock').count(),0,'flagship uses public navigation, not the member dock');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);
  await page.locator('main img').first().evaluate(i=>i.decode());
  await page.screenshot({path:`artifacts/public-experience/flagship-${width}-${height}.png`});
  const directions=page.getByRole('group',{name:'Choose your Reserve direction'});
  for(const [name,href] of [['Presence','/pathways?priority=presence'],['Performance','/pathways?priority=performance'],['Vitalis','/vitalis/journey']]){
   await directions.getByRole('button',{name,exact:true}).click();
   assert.equal(await directions.locator('button[aria-pressed=true]').count(),1);
   const result=page.locator('[aria-live=polite]');const link=result.getByRole('link');assert.equal(await link.getAttribute('href'),href);
   await directions.evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
   const box=await link.boundingBox();assert.ok(box.y>=0 && box.y+box.height<=height,`direction CTA clipped ${width}x${height} ${name}: ${JSON.stringify(box)}`);
  }
  const menu=page.getByLabel('Open navigation menu');await menu.click();
  assert.ok(await page.getByRole('navigation',{name:'All public destinations'}).isVisible());
  await page.keyboard.press('Escape');assert.equal(await page.locator('details[open]').count(),0);
  assert.equal(await menu.evaluate(el=>document.activeElement===el),true);
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await page.screenshot({path:`artifacts/public-experience/flagship-full-${width}-${height}.png`,fullPage:true});
  console.log(`PASS viewport ${width}x${height}, directions, menu and overflow`);
 }
 console.log('Checking motion and route regressions');
 await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/discover');
 await page.getByLabel('Open navigation menu').click();await page.getByRole('button',{name:'Pause environment motion'}).click();
 await expect(page.locator('html')).toHaveAttribute('data-reserve-still','true');
 await page.reload();await expect(page.locator('html')).toHaveAttribute('data-reserve-still','true');
 await page.getByLabel('Open navigation menu').click();await page.getByRole('button',{name:'Enable environment motion'}).click();await page.keyboard.press('Escape');
 await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('html')).toHaveAttribute('data-reserve-still','true');
 await page.getByRole('group',{name:'Choose your Reserve direction'}).getByRole('button',{name:'Performance',exact:true}).focus();await page.keyboard.press('Enter');
 assert.equal(await page.locator('[aria-live=polite] a').getAttribute('href'),'/pathways?priority=performance');
 await page.getByRole('link',{name:'Explore Virelis',exact:true}).click();await page.waitForURL('**/shop/vitalis');await page.locator('main h1').filter({hasNotText:'Opening Legacy Reserve.'}).waitFor();
 for(const path of ['/discover/membership','/discover/aethelios','/home?explore=1','/pathways','/vitalis','/fix-it-shop','/fix-it-shop/app','/shop']){
  console.log(`Checking route ${path}`);
  await page.goto(base+path,{waitUntil:'domcontentloaded'});await page.locator('main h1').filter({hasNotText:'Opening Legacy Reserve.'}).waitFor();
  assert.equal(await page.locator('[data-lr-theme=mineral]').count(),0,`theme leaked into ${path}`);
  for(const width of [320,390,884,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${path} overflow ${width}`);}
 }
 console.log('Checking no-JavaScript navigation');
 const noJs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const staticPage=await noJs.newPage();staticPage.setDefaultTimeout(15000);await staticPage.goto(base+'/discover',{waitUntil:'domcontentloaded'});
 await writeFile('artifacts/public-experience/no-js.html',await staticPage.content());await staticPage.screenshot({path:'artifacts/public-experience/no-js.png',fullPage:true});
 await staticPage.getByRole('heading',{name:'Built for Presence.'}).waitFor();await staticPage.getByLabel('Open navigation menu').click();
 assert.ok(await staticPage.getByRole('navigation',{name:'All public destinations'}).isVisible());
 assert.equal(await staticPage.locator('main a').count()>10,true);await noJs.close();
 console.log('Checking forced colors and text scaling');
 await page.goto(base+'/discover',{waitUntil:'domcontentloaded'});await page.emulateMedia({forcedColors:'active'});await page.getByRole('heading',{name:'Built for Presence.'}).waitFor();
 assert.ok(await page.getByRole('link',{name:'Explore the Collection',exact:true}).isVisible());
 await page.emulateMedia({forcedColors:'none'});await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'large text overflow');
 assert.deepEqual(errors,[]);console.log('PASS: flagship responsive composition, keyboard, menu, route handoff, scoped themes, still/reduced motion, no-JS navigation, forced colors, 200% root text, zero runtime errors');
} catch(e){console.log(log);throw e;}finally{await browser?.close();server.kill();}
