import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
if (process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) throw Error('Isolated, unconfigured production verification only');
const base='http://127.0.0.1:3004';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3004'],{env:{...process.env,APP_ORIGIN:base,RESERVE_DEV_PREVIEW:'false'},stdio:['ignore','pipe','pipe']});
let browser, log='';
server.stdout.on('data',d=>log+=d);server.stderr.on('data',d=>log+=d);
try {
 await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('Ready'))resolve();});server.on('exit',c=>reject(Error('server exited '+c)));setTimeout(()=>reject(Error('startup timeout')),30000).unref();});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const context=await browser.newContext({viewport:{width:360,height:780},hasTouch:true,isMobile:true});
 const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const authRequests=[]; page.on('request',req=>{if(/\/(signin|account|my-visit|my-sanctum|studio)(\?|$)/.test(req.url()))authRequests.push(req.url());});
 await mkdir('artifacts/brand-entry-depth',{recursive:true});
 for(const route of ['/home','/fix-it-shop','/gent-ascend']) {
  authRequests.length=0;
  await page.goto(base+route);await page.locator('main h1').waitFor();await page.waitForTimeout(700);
  await page.evaluate(()=>document.querySelector('.footer')?.scrollIntoView());
  await page.locator('.experience-menu summary').click();await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  await page.evaluate(()=>{const now=Date.now;Date.now=()=>now()+31000;window.dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('visibilitychange'));Date.now=now;});
  await page.waitForTimeout(500);
  assert.equal(new URL(page.url()).pathname,route,'Public exploration stays on its route');
  assert.deepEqual(authRequests,[],'Public pages must not prefetch protected/sign-in routes');
  console.log('PASS public idle/menu/focus: '+route);
 }
 for(const route of ['/account','/my-visit','/my-sanctum','/studio']) {
  await page.goto(base+route);await page.getByRole('heading',{name:/Your Reserve/}).waitFor();
  assert.equal(new URL(page.url()).pathname,route);
  assert.equal(await page.getByRole('link',{name:/Sign in to continue/}).count(),1);
  assert.doesNotMatch(await page.locator('main').innerText(),/REF |today’s schedule|Signature grooming/);
 }
 for(const route of ['/api/appointments','/api/grooming-profile','/api/studio/command']) {
  const response=await context.request.get(base+route); assert.ok([401,403,503].includes(response.status()),'Private API remains closed: '+route);
 }
 console.log('PASS missing-session inline entrance and private API denial');
 await page.goto(base+'/home');
 for(const width of [320,360,393,884,1440]) {
  await page.setViewportSize({width,height:width<600?780:1000});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no overflow '+width);
  await page.screenshot({path:`artifacts/brand-entry-depth/home-${width}.png`});
 }
 const button=page.getByRole('link',{name:'Book a visit ↗',exact:true});
 await button.scrollIntoViewIfNeeded();const box=await button.boundingBox();
 const rest=await button.evaluate(el=>({transform:getComputedStyle(el).transform,shadow:getComputedStyle(el).boxShadow}));
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(180);
 const pressed=await button.evaluate(el=>({transform:getComputedStyle(el).transform,shadow:getComputedStyle(el).boxShadow}));
 assert.notEqual(pressed.transform,rest.transform);assert.notEqual(pressed.shadow,rest.shadow);
 await page.screenshot({path:'artifacts/brand-entry-depth/button-pressed.png'});
 await page.mouse.move(2,2);await page.mouse.up();
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(200);
 assert.equal(await button.evaluate(el=>getComputedStyle(el).transform),'none');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(200);
 await page.evaluate(()=>document.documentElement.dataset.reserveStill='true');await page.waitForTimeout(200);
 assert.equal(await button.evaluate(el=>getComputedStyle(el).transform),'none');
 console.log('PASS actual pressed 3D depth and reduced/still motion');
 const manifest=await(await context.request.get(base+'/manifest.webmanifest')).json();
 assert.equal(manifest.id,'/');assert.equal(manifest.start_url,'/enter');
 for(const icon of manifest.icons) {assert.match(icon.src,/reserve-rs-v1/);const response=await context.request.get(base+icon.src);assert.equal(response.status(),200);const bytes=await response.body();const meta=await sharp(bytes).metadata();assert.equal(`${meta.width}x${meta.height}`,icon.sizes);}
 const apple=await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');assert.match(apple,/reserve-rs-v1/);
 assert.equal((await context.request.get(base+'/favicon.ico')).status(),200);
 await page.goto(base+'/chair');
 await page.getByRole('radio',{name:'Clean me up.',exact:true}).waitFor();
 const next=page.getByRole('button',{name:'Continue',exact:true});
 await page.getByRole('radio',{name:'Clean me up.',exact:true}).check();
 await next.focus();await page.keyboard.down('Space');await page.waitForTimeout(180);
 assert.match(await next.evaluate(el=>getComputedStyle(el).transform),/matrix3d/);
 await page.keyboard.up('Space');await page.getByRole('radio',{name:'Mostly.',exact:true}).waitFor();
 assert.equal(await next.isDisabled(),true);
 assert.equal(await next.evaluate(el=>getComputedStyle(el).transform),'none');
 await page.getByRole('radio',{name:'Got a lot going on.',exact:true}).check();
 await next.scrollIntoViewIfNeeded();const touchBox=await next.boundingBox();
 const touchClient=await context.newCDPSession(page);
 await touchClient.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touchBox.x+touchBox.width/2,y:touchBox.y+touchBox.height/2}]});
 await page.waitForTimeout(180);
 assert.match(await next.evaluate(el=>getComputedStyle(el).transform),/matrix3d/);
 await touchClient.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.getByRole('radio',{name:'Work',exact:true}).waitFor();
 console.log('PASS native keyboard Space and touch press advance The Chair; disabled control has no press transform');
 await page.goto(base+'/?replay=1');await page.getByRole('link',{name:'Enter the Reserve',exact:true}).waitFor();
 assert.match(await page.locator('.threshold-content>img').getAttribute('src'),/reserve-rs-v1/);
 await page.screenshot({path:'artifacts/brand-entry-depth/arrival-1440.png'});
 assert.deepEqual(errors,[]);console.log('PASS new RS identity/icons/manifest/favicon and no runtime errors');
} catch(error) {console.error(log.slice(-2500));throw error;} finally {await browser?.close();server.kill('SIGTERM');}
