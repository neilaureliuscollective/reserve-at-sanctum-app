import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('artifacts/public-experience',{recursive:true});
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3116'],{cwd:process.cwd(),env:{...process.env,RESERVE_DEV_PREVIEW:'true'},stdio:['ignore','pipe','pipe']});
let log=''; server.stdout.on('data',d=>log+=d); server.stderr.on('data',d=>log+=d);
await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('Ready in'))resolve()});server.on('exit',()=>reject(Error(log)));setTimeout(()=>reject(Error(log)),30000).unref()});
try {
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
const page = await browser.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:3116/discover',{waitUntil:'domcontentloaded'});
for(const width of [320,390,884,1440]){
 await page.setViewportSize({width,height:900});

 await page.getByRole('heading',{name:'Small-town roots. A bigger standard.'}).waitFor();
 await page.locator('#vitalis').scrollIntoViewIfNeeded();
 await page.screenshot({path:`artifacts/public-experience/vitalis-${width}.png`});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);
 await page.locator('#your-way').scrollIntoViewIfNeeded();
 for(const name of ['Grooming','Vitalis','Collection']){
  await page.getByRole('button',{name:new RegExp(name)}).click();
  await page.waitForTimeout(900);
  const link=page.locator('.public-compass-result .button');
  assert.ok(await link.isVisible());
  const b=await link.boundingBox();assert.ok(b.y>=0 && b.y+b.height<=900,`Compass CTA outside viewport ${width} ${name}`);
 }
 await page.screenshot({path:`artifacts/public-experience/compass-${width}.png`});
}
await page.emulateMedia({reducedMotion:'reduce'});
await page.locator('#vitalis').scrollIntoViewIfNeeded();
assert.equal(await page.locator('.public-vitalis-sphere').evaluate(el=>getComputedStyle(el).transform),'none');
assert.deepEqual(errors,[]);
await page.goto('http://127.0.0.1:3116/',{waitUntil:'domcontentloaded'});
await page.getByRole('link',{name:'Enter immediately',exact:true}).click();
await page.waitForURL('**/discover');
console.log('PASS: arrival routes to public site; mobile/Fold/desktop overflow; all Compass CTAs in viewport; reduced motion; zero runtime errors');
await browser.close();
} catch(e) { console.log(log); throw e; } finally {server.kill();}
