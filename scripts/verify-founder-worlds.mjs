import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
if (process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) throw Error('Run founder verification without hosted credentials');
await mkdir('artifacts/founder-worlds', {recursive:true});
const port=3124, base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env:{...process.env,RESERVE_DEV_PREVIEW:'false'},stdio:['ignore','pipe','pipe']});
let log='',browser;server.stdout.on('data',d=>log+=d);server.stderr.on('data',d=>log+=d);
try {
 await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('Ready'))resolve()});server.on('exit',()=>reject(Error(log)));setTimeout(()=>reject(Error(log)),30000).unref()});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const context=await browser.newContext(); const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [width,height] of [[320,780],[390,660],[390,844],[884,900],[1440,1000]]) {
  console.log(`Checking founder worlds ${width}x${height}`);
  await page.setViewportSize({width,height});
  for(const route of ['/founder','/founder/legacy-reserve','/founder/aethelios-technologies']) {
   await page.goto(base+route,{waitUntil:'load'});await page.locator('main h1').waitFor();
   assert.equal(new URL(page.url()).pathname,route,'public founder route must stay public');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow ${route} ${width}`);
   for(const img of await page.locator('main img').all())await img.evaluate(i=>i.decode());
   await page.screenshot({path:`artifacts/founder-worlds/${route.split('/').pop()}-${width}-${height}.png`});
   if(route==='/founder')continue;
   for(const button of await page.locator('.founder-path-controls button').all()) {
    await button.click();await page.waitForTimeout(200);
    assert.equal(await page.locator('.founder-path-controls button[aria-pressed=true]').count(),1);
    const selected=await page.locator('.founder-explorer').getAttribute('data-selection');
    const detail=page.locator('.founder-path-detail');
    assert.ok(await detail.getByRole('heading').isVisible(),`detail absent ${selected}`);
    if(width<=700) {
     const cta=await detail.getByRole('link').boundingBox(),dock=await page.locator('.command-dock').boundingBox();
     assert.ok(cta.y>=0&&cta.y+cta.height<dock.y-4,`CTA blocked ${route} ${width}x${height} ${selected}: ${JSON.stringify(cta)} dock ${dock.y}`);
    }
   }
   await page.screenshot({path:`artifacts/founder-worlds/scene-${route.split('/').pop()}-${width}-${height}.png`});
   await page.locator('.founder-path-controls button').first().focus();await page.keyboard.press('Enter');
   assert.equal(await page.locator('.founder-path-controls button').first().getAttribute('aria-pressed'),'true');
  }
 }
 for(const route of ['/gent-ascend','/aurelius']){await page.goto(base+route);await page.waitForURL('**/founder/legacy-reserve');assert.equal(new URL(page.url()).pathname,'/founder/legacy-reserve')}
 await page.goto(base+'/founder/aethelios-technologies');assert.equal(await page.locator('.command-dock a[aria-current=page]').innerText(),'Aethelios');
 await page.setViewportSize({width:1440,height:1000});
 await page.evaluate(()=>scrollTo({top:300,behavior:'instant'}));await page.waitForTimeout(100);
 assert.ok(Number(await page.locator('.founder-world').evaluate(el=>el.style.getPropertyValue('--founder-depth')))>0,'scroll must change depth');
 await page.locator('.experience-menu summary').click();await page.getByRole('button',{name:'Pause environment motion'}).click();
 await page.waitForTimeout(100);assert.equal(await page.locator('.founder-world').evaluate(el=>el.style.getPropertyValue('--founder-depth')),'0.000');
 await page.getByRole('button',{name:'Enable environment motion'}).click();await page.keyboard.press('Escape');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
 assert.equal(await page.locator('.founder-world').evaluate(el=>el.style.getPropertyValue('--founder-depth')),'0.000');
 assert.equal(await page.locator('.founder-path-core span').evaluate(el=>getComputedStyle(el).animationName),'none');
 // Each destination must resolve to a real route, including unavailable/inline account entrances.
 const links=await page.locator('main a[href^="/"]').evaluateAll(els=>els.map(el=>el.getAttribute('href')));
 await page.goto(base+'/founder/legacy-reserve');
 links.push(...await page.locator('main a[href^="/"]').evaluateAll(els=>els.map(el=>el.getAttribute('href'))));
 for(const href of new Set(links)){const r=await context.request.get(base+href);assert.ok(r.status()<400,`${href}: ${r.status()}`)}
 await page.goto(base+'/discover');await page.getByRole('link',{name:'Meet the Founder',exact:false}).first().click();await page.waitForURL('**/founder');
 await page.goto(base+'/discover/aethelios');await page.getByRole('link',{name:'Enter the technology founder world',exact:false}).click();await page.waitForURL('**/founder/aethelios-technologies');
 const katie=await context.request.get(base+'/fix-it-shop');assert.ok(katie.ok());
 // Complete generated photographs must replace the old source and silhouette mask.
 assert.ok((await page.locator('.founder-portrait').getAttribute('src')).includes('neil-aethelios-v2.webp'));
 assert.equal(await page.locator('.founder-portrait').evaluate(el=>getComputedStyle(el).maskImage),'none');
 assert.equal(await page.locator('.founder-portrait').evaluate(el=>getComputedStyle(el).objectFit),'cover');
 assert.equal(await page.locator('.founder-background-crest,.founder-background-signal').count(),0);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/founder/legacy-reserve',{waitUntil:'load'});
 await page.screenshot({path:'artifacts/founder-worlds/legacy-desktop-full.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.goto(base+'/founder/aethelios-technologies',{waitUntil:'load'});await page.screenshot({path:'artifacts/founder-worlds/technology-phone-full.png',fullPage:true});
 const noJS=await browser.newContext({javaScriptEnabled:false});const staticPage=await noJS.newPage();await staticPage.goto(base+'/founder/legacy-reserve');assert.ok(await staticPage.getByRole('heading',{name:'Choose your entrance.'}).isVisible());assert.ok(await staticPage.getByRole('link',{name:'Neil Stutes · The Founder ↗',exact:true}).isVisible());assert.ok(await staticPage.getByRole('link',{name:'Sanctum ↗',exact:true}).count()>0);await noJS.close();
 assert.deepEqual(errors,[]);
 console.log('PASS: founder gateway and both worlds; 320px/short phone/Fold/desktop; visible scene CTAs; keyboard; direct public access; legacy redirects; route handoffs; correct dock; motion/still; complete photographic portraits; no-JS; zero runtime errors');
} catch(e){console.log(log);throw e} finally{await browser?.close();server.kill()}
