import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
await mkdir('artifacts/public-experience',{recursive:true});
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3116'],{cwd:process.cwd(),env:{...process.env,RESERVE_DEV_PREVIEW:'false'},stdio:['ignore','pipe','pipe']});
let log=''; server.stdout.on('data',d=>log+=d); server.stderr.on('data',d=>log+=d);
let browser;
try {
 await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('Ready in'))resolve()});server.on('exit',()=>reject(Error(log)));setTimeout(()=>reject(Error(log)),30000).unref()});
 browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page = await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:3116/discover',{waitUntil:'networkidle'});
 for(const [width,height] of [[320,780],[390,844],[390,660],[884,900],[1440,1000]]){
  await page.setViewportSize({width,height});
  await page.getByRole('heading',{name:'Small-town roots. A bigger standard.'}).waitFor();
  await page.locator('#vitalis').scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await page.screenshot({path:`artifacts/public-experience/vitalis-${width}-${height}.png`});

  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);
  await page.locator('#your-way').scrollIntoViewIfNeeded();
  for(const [index,name] of ['Grooming','Vitalis','Collection'].entries()){
   await page.getByRole('button',{name:new RegExp(`0${index+1}.*${name}`)}).click();
   await page.waitForTimeout(1000);
   const link=page.locator('.public-compass-result .button');
   assert.ok(await link.isVisible());
   const b=await link.boundingBox();assert.ok(b.y>=0 && b.y+b.height<=height-35,`Compass CTA outside viewport ${width}x${height} ${name}: ${JSON.stringify(b)}`);
   assert.equal(await page.locator('.compass-environment[data-active="true"]').count(),1);
   assert.equal(await page.getByRole('button',{name:new RegExp(`0${index+1}.*${name}`)}).getAttribute('aria-pressed'),'true');
   if(name==='Vitalis') await page.screenshot({path:`artifacts/public-experience/compass-${width}-${height}.png`});
  }
  await page.locator('#the-collection').scrollIntoViewIfNeeded();
  await page.getByRole('button',{name:'Show HYDROS',exact:true}).click();
  await page.getByRole('heading',{name:'HYDROS',exact:true}).waitFor();
  await page.locator('.collection-object img').evaluate(img=>img.decode());
  await page.screenshot({path:`artifacts/public-experience/collection-${width}-${height}.png`});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`collection overflow ${width}`);
 }
 // Scroll controls actual spatial motion, rather than only an opacity entrance.
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('#the-place').evaluate(el=>window.scrollTo({top:el.offsetTop,behavior:'instant'}));
 await page.waitForTimeout(200);
 const start=await page.locator('.house-environment').evaluate(el=>getComputedStyle(el).transform);
 await page.evaluate(()=>window.scrollBy({top:450,behavior:'instant'})); await page.waitForTimeout(200);
 const end=await page.locator('.house-environment').evaluate(el=>getComputedStyle(el).transform);
 assert.notEqual(start,end,'house camera must advance with document scroll');
 // Manual still preference and system reduced motion both flatten sticky sequences.
 await page.locator('.experience-menu summary').click();
 await page.getByRole('button',{name:'Pause environment motion'}).click();
 assert.equal(await page.locator('.house-environment').evaluate(el=>getComputedStyle(el).transform),'none');
 await page.getByRole('button',{name:'Enable environment motion'}).click();
 await page.locator('.experience-menu summary').click();
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.locator('#vitalis').scrollIntoViewIfNeeded();
 assert.equal(await page.locator('.vitalis-observatory').first().evaluate(el=>getComputedStyle(el).transform),'none');
 assert.equal(await page.locator('.vitalis-frame').evaluate(el=>getComputedStyle(el).position),'relative');
 // Navigation still reaches genuine existing flows, preserving role and session authority.
 await page.getByRole('link',{name:'Explore the Vitalis vision',exact:false}).click();
 await page.waitForURL('**/vitalis');
 await page.getByRole('heading',{name:'Precision for a longer horizon.'}).waitFor();
 await page.getByRole('link',{name:'View public website',exact:false}).click();
 await page.waitForURL('**/discover');
 await page.getByRole('navigation',{name:'Legacy Reserve navigation',exact:true}).getByRole('link',{name:'Membership',exact:true}).click();
 await page.waitForURL('**/discover/membership');
 await page.getByRole('heading',{name:'A place to belong. A standard to return to.'}).waitFor();
 for(const width of [320,390,884,1440]) { await page.setViewportSize({width,height:900}); assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`membership overflow ${width}`); }
 await page.goto('http://127.0.0.1:3116/discover');
 const failedImages=await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>i.complete && i.naturalWidth===0).map(i=>i.src));
 assert.deepEqual(failedImages,[]);
 assert.deepEqual(errors,[]);
 for (const img of await page.locator('img').all()) { await img.scrollIntoViewIfNeeded(); await img.evaluate(i=>i.decode()); }
 await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
 await page.screenshot({path:'artifacts/public-experience/home-desktop.png',fullPage:true});
 console.log('PASS: mobile/short-mobile/Fold/desktop layouts; Compass environments and visible CTAs; collection selection; scroll-driven camera; manual/system still modes; Vitalis navigation; public membership; zero runtime errors or failed images');
} catch(e) { console.log(log); throw e; } finally {await browser?.close();server.kill();}
