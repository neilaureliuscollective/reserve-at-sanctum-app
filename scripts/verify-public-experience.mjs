import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
await mkdir('artifacts/public-experience',{recursive:true});
const port=process.env.VERIFY_PUBLIC_PORT || '3116';
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',port],{cwd:process.cwd(),env:{...process.env,RESERVE_DEV_PREVIEW:'false'},stdio:['ignore','pipe','pipe']});
let log=''; server.stdout.on('data',d=>log+=d); server.stderr.on('data',d=>log+=d);
let browser;
const base=`http://127.0.0.1:${port}`;
try {
 await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('Ready in'))resolve()});server.on('exit',()=>reject(Error(log)));setTimeout(()=>reject(Error(log)),30000).unref()});
 browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page = await browser.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/',{waitUntil:'networkidle'}); assert.equal(new URL(page.url()).pathname,'/discover');
 for(const [width,height] of [[320,780],[390,844],[390,660],[884,900],[1440,1000]]){
  console.log(`Checking public viewport ${width}x${height}`);
  await page.setViewportSize({width,height}); await page.goto(base+'/discover',{waitUntil:'networkidle'});
  await page.getByRole('heading',{name:'Your life. At a higher standard.'}).waitFor();
  assert.equal(await page.locator('.arrival, .house-sequence, .public-grooming').count(),0,'digital homepage must not contain the old house hero');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`home overflow ${width}`);
  await page.screenshot({path:`artifacts/public-experience/digital-arrival-${width}-${height}.png`});
  await page.locator('.digital-selector').scrollIntoViewIfNeeded();
  for(const [id,name] of [['presence','Presence'],['performance','Performance'],['wellness','Vitalis']]){
   await page.locator('.digital-world-controls').getByRole('button',{name:new RegExp(name)}).click(); await page.waitForTimeout(1000);
   assert.equal(await page.locator('.digital-selector').getAttribute('data-world'),id);
   assert.equal(await page.locator('.digital-world-controls button[aria-pressed=true]').count(),1);
   const link=page.locator('.digital-world-copy .button'); const b=await link.boundingBox();
   assert.ok(b.y>=0&&b.y+b.height<=(await page.locator(".command-dock").boundingBox()).y-8,`selected CTA outside viewport ${width}x${height} ${name}: ${JSON.stringify(b)}`);
   assert.equal(await page.locator('.digital-world-preview .digital-instrument').getAttribute('data-world'),id);
   if(name==='Vitalis') await page.screenshot({path:`artifacts/public-experience/digital-selector-${width}-${height}.png`});
  }
  await page.getByRole('button',{name:'Do I have to visit Sanctum?',exact:true}).click();
  await page.getByText('Your digital Reserve travels with you.',{exact:false}).waitFor();
  await page.screenshot({path:`artifacts/public-experience/digital-aethelios-${width}-${height}.png`});
  await page.getByRole('button',{name:'Show HYDROS',exact:true}).click();
  await page.getByRole('heading',{name:'HYDROS',exact:true}).waitFor();
  await page.locator('.collection-object img').evaluate(img=>img.scrollIntoView({block:'center',behavior:'instant'}));
  await page.locator('.collection-object img').evaluate(img=>img.decode());
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`collection overflow ${width}`);
 }
 // The Living Crest replaces the hero instrument; the selector stays intact.
 await page.setViewportSize({width:1440,height:1000}); await page.goto(base+'/discover');
 await page.locator('.living-crest[data-crest-state="active"]').waitFor();
 assert.equal(await page.locator('.living-crest canvas').count(),1);
 assert.equal(await page.locator('.digital-arrival-field>.digital-instrument').count(),0);
 await page.locator('.experience-menu summary').click(); await page.getByRole('button',{name:'Pause environment motion'}).click();
 assert.equal(await page.locator('.digital-vitalis-object').evaluate(el=>getComputedStyle(el).transform),'none');
 await page.getByRole('button',{name:'Enable environment motion'}).click(); await page.locator('.experience-menu summary').click();
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.locator('.digital-vitalis-object').evaluate(el=>getComputedStyle(el).transform),'none');
 await page.getByRole('navigation',{name:'Legacy Reserve navigation',exact:true}).getByRole('link',{name:'Vitalis',exact:true}).click();
 await page.waitForURL('**/vitalis'); await page.getByRole('heading',{name:'Precision for a longer horizon.'}).waitFor();
 await page.locator('.experience-menu summary').click(); await page.getByRole('link',{name:'View public homepage',exact:false}).click(); await page.waitForURL('**/discover');
 for(const path of ['/discover/membership','/discover/aethelios','/home?explore=1','/pathways','/vitalis']){
  await page.goto(base+path,{waitUntil:'networkidle'}); await page.locator('main h1').waitFor();
  for(const width of [320,390,884,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${path} overflow ${width}`);}
 }
 // Keyboard controls must visibly select a path, not require hover.
 await page.goto(base+'/discover'); await page.locator('.digital-world-controls button').first().focus(); await page.keyboard.press('Enter');
 assert.equal(await page.locator('.digital-selector').getAttribute('data-world'),'presence');
 await page.emulateMedia({reducedMotion:'no-preference'}); await page.setViewportSize({width:1440,height:1000});
 for (const img of await page.locator('img').all()) {await img.evaluate(i=>i.scrollIntoView({block:'center',behavior:'instant'})); await img.evaluate(i=>i.decode());}
 await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(250);
 await page.screenshot({path:'artifacts/public-experience/digital-home-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844}); await page.goto(base+'/discover');
 for (const img of await page.locator('img').all()) {await img.evaluate(i=>i.scrollIntoView({block:'center',behavior:'instant'})); await img.evaluate(i=>i.decode());}
 await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(250);
 await page.screenshot({path:'artifacts/public-experience/digital-home-phone.png',fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('PASS: digital-first entry; 320px/short-phone/Fold/desktop; three visible world destinations; curated Aethelios interactions; collection; real route handoffs; keyboard; scroll depth; manual/system still; zero page errors');
} catch(e) {console.log(log);throw e;} finally {await browser?.close();server.kill();}
