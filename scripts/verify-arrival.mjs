import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { DateTime } from 'luxon';
if (process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NODE_ENV === 'production') throw Error('Only isolated synthetic local preview is permitted');
await mkdir('artifacts', {recursive:true});
const base = 'http://127.0.0.1:3000';
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1'], {env:{...process.env, RESERVE_DEV_PREVIEW:'true', APP_ORIGIN:base},stdio:['ignore','pipe','pipe']});
let browser;
try {
  await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('Ready in'))resolve();});server.stderr.on('data',d=>process.stderr.write(d));server.on('exit',c=>reject(Error('Server exited '+c)));setTimeout(()=>reject(Error('Server startup timed out')),30000).unref();});
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined,args:['--no-sandbox','--disable-dev-shm-usage','--single-process','--use-gl=angle','--use-angle=swiftshader']});
  const errors=[];
  const context=await browser.newContext({viewport:{width:360,height:640}});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/?replay=1');await page.waitForTimeout(300);
  for(const name of ['Enter the Reserve','Book a visit ↗']) {const box=await page.getByRole('link',{name,exact:true}).boundingBox();assert(box && box.y>=0 && box.y+box.height<=640, name+' must fit initial mobile viewport');}
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'artifacts/arrival-mobile.png',fullPage:true});
  await page.getByRole('link',{name:'Enter the Reserve',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Opening the Reserve'}).waitFor();
  await page.getByRole('link',{name:'Enter immediately ↗',exact:true}).waitFor();
  await page.waitForURL('**/home');await page.getByRole('heading',{name:'Welcome to the Reserve.'}).waitFor();
  assert((await context.cookies()).some(c=>c.name==='reserve-arrival-v1' && c.value==='seen'));
  console.log('Threshold timing:',await page.evaluate(()=>performance.getEntriesByName('reserve:threshold-to-home').map(e=>Math.round(e.duration))));
  await page.screenshot({path:'artifacts/home-mobile.png',fullPage:true});
  await page.locator('.experience-menu summary').click();await page.getByRole('button',{name:'Pause environment motion'}).click();
  assert.equal(await page.locator('html').getAttribute('data-reserve-still'),'true');
  await page.reload();await page.locator('.experience-menu summary').click();await page.getByRole('button',{name:'Enable environment motion'}).waitFor();
  await page.goto(base+'/?replay=1');await page.getByRole('link',{name:'Enter the Reserve',exact:true}).click();await page.waitForURL('**/home');
  await page.locator('.experience-menu summary').click();await page.getByRole('link',{name:'The Chair',exact:true}).waitFor();await page.keyboard.press('Escape');assert.equal(await page.locator('.experience-menu').getAttribute('open'),null);
  await page.setViewportSize({width:320,height:640});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/?replay=1');await page.screenshot({path:'artifacts/arrival-desktop.png',fullPage:true});
  await page.setViewportSize({width:768,height:900});await page.goto(base+'/home');await page.screenshot({path:'artifacts/home-fold.png',fullPage:true});
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base+'/?replay=1');await page.getByRole('link',{name:'Enter the Reserve',exact:true}).click();await page.waitForURL('**/home');assert.equal(await page.locator('html').getAttribute('data-reserve-still'),'true');
  const blocked=await browser.newContext({viewport:{width:360,height:640}});await blocked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage blocked');}});});const blockedPage=await blocked.newPage();blockedPage.on('pageerror',e=>errors.push(e.message));await blockedPage.goto(base+'/?replay=1');await blockedPage.getByRole('link',{name:'Enter immediately',exact:true}).click();await blockedPage.waitForURL('**/home');
  const plain=await browser.newContext({javaScriptEnabled:false});const plainPage=await plain.newPage();await plainPage.goto(base+'/?replay=1');await plainPage.getByRole('link',{name:'Enter the Reserve',exact:true}).click();await plainPage.waitForURL('**/home');
  for(const [identity,heading] of [['preview-katie','Your working day.'],['preview-neil','Reserve Command.'],['preview-client','Welcome back, Jordan.']]) {
    const response=await context.request.post(base+'/api/auth',{headers:{origin:base},data:{action:'preview',identity}});assert.equal(response.status(),200);
    await page.goto(base+'/enter');await page.getByRole('heading',{name:heading,exact:true}).waitFor();
    if(identity==='preview-client') {
      const catalog=await (await context.request.get(base+'/api/availability')).json();const service=catalog.services[0];let start;
      for(let i=1;i<8 && !start;i++){const date=DateTime.now().setZone('America/Chicago').plus({days:i}).toISODate();const slots=await (await context.request.get(base+`/api/availability?service=${service.id}&date=${date}`)).json();start=slots.slots?.[0]?.start;}
      assert(start,'Expected preview availability');
      const booking=await context.request.post(base+'/api/appointments',{headers:{origin:base},data:{serviceId:service.id,start,note:'',requestKey:crypto.randomUUID()}});assert.equal(booking.status(),201);const {appointment}=await booking.json();
      await page.goto(base+'/home');await page.getByRole('link',{name:'Get your chair ready',exact:true}).waitFor();assert.match(await page.locator('.visit-ledger').innerText(),new RegExp(service.name));
      const cancelled=await context.request.patch(base+'/api/appointments/'+appointment.id,{headers:{origin:base},data:{action:'cancel',revision:appointment.revision}});assert.equal(cancelled.status(),200);
    }
  }
  await page.goto(base+'/book?service=signature');assert.equal(await page.locator('.reserve-threshold').count(),0);
  assert.equal((await (await context.request.get(base+'/manifest.webmanifest')).json()).start_url,'/enter');
  assert.deepEqual(errors,[]);
  console.log('PASS: mobile/Fold/desktop composition, threshold/bypass, persisted still, reduced motion, menu keyboard, denied storage, no-JS public entry, verified client/staff/owner routing, real synthetic upcoming visit and cancellation, direct booking, PWA target, no page errors.');
} catch(error) { console.error(error); throw error; } finally {await browser?.close();server.kill('SIGTERM');}
