import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import { DateTime } from 'luxon';
if(process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NODE_ENV==='production') throw Error('Isolated synthetic preview only');
const base='http://localhost:3000';
const out='artifacts/visit-continuity';
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1'],{env:{...process.env,RESERVE_DEV_PREVIEW:'true',APP_ORIGIN:base},stdio:['ignore','pipe','pipe']});
let browser, log='';
server.stdout.on('data',d=>log+=d);server.stderr.on('data',d=>log+=d);
const proofs=[];
async function cli(args) {
  const binary=process.env.AGENT_BROWSER_PATH;
  if(!binary) return;
  return await new Promise((resolve,reject)=>{
    const child=spawn(binary,['--debug','--session','reserve-phase2','--executable-path',process.env.CHROMIUM_PATH,'--args','--no-sandbox,--disable-dev-shm-usage,--disable-gpu',...args]);
    let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
    child.on('exit',c=>c===0?resolve(output):reject(Error(output)));
  });
}
try {
  await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('Ready in'))resolve();});server.on('exit',c=>reject(Error('server exited '+c)));setTimeout(()=>reject(Error('startup timeout')),30000).unref();});
  if(process.env.AGENT_BROWSER_PATH){
    await cli(['open',base]);
    await cli(['wait','--load','networkidle']);
    const snapshot=await cli(['snapshot','-i']);assert.match(snapshot,/Enter the Reserve/);
    const state=await cli(['eval','document.querySelector("[data-nextjs-dialog]") ? "ERROR_OVERLAY" : document.body.innerText.trim().length > 0 ? "HAS_CONTENT" : "BLANK"']);assert.match(state,/HAS_CONTENT/);
    await cli(['screenshot',`${out}/agent-browser-arrival.png`]);
    await writeFile(`${out}/agent-browser-snapshot.txt`,snapshot);
    await cli(['close']);proofs.push('agent-browser: page load, content, no error overlay, interactive snapshot');
  }
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  const context=await browser.newContext({viewport:{width:360,height:640}});
  const page=await context.newPage();page.setDefaultTimeout(25000);
  await context.request.post(base+'/api/auth',{headers:{Origin:base},data:{action:'preview',identity:'preview-client'}});
  const beforeMirror = (await(await context.request.get(base+'/api/grooming-profile')).json()).profile;
  await context.request.post(base+'/api/auth',{headers:{Origin:base},data:{action:'signout'}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const visit=async path=>{await page.goto(base+path);await page.waitForLoadState('networkidle');};
  const overflow=async path=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,path+' horizontal overflow');
  for(const viewport of [{width:320,height:800},{width:360,height:640},{width:884,height:960},{width:1440,height:1000}]) {
    await page.setViewportSize(viewport);
    for(const route of ['/','/home','/fix-it-shop','/gent-ascend','/chair','/sanctum-mirror']) {
      await visit(route);await page.locator('main h1').waitFor();await overflow(route);
      assert.equal(await page.locator('main h1').count(),1);
      if(route==='/' && viewport.width===360){for(const name of ['Enter the Reserve','Book a visit']){const box=await page.getByRole('link',{name: name === 'Book a visit' ? /^Book a visit/ : name,exact:name !== 'Book a visit'}).boundingBox();assert.ok(box&&box.y>=0&&box.y+box.height<=640,name+' above fold');}}
      if(route==='/sanctum-mirror' && viewport.width===360){const box=await page.getByRole('button',{name:'Begin your Blueprint',exact:true}).boundingBox();assert.ok(box&&box.y+box.height<=640,'Mirror action above fold');}
      if([360,1440].includes(viewport.width))await page.screenshot({path:`${out}/${route==='/'?'arrival':route.slice(1)}-${viewport.width}.png`});
    }
  }
  proofs.push('320/360/884/1440px arrival/home/worlds/Chair/Mirror: one h1, no horizontal overflow; Enter and Book visible at 360x640');
  await page.setViewportSize({width:360,height:640});
  await visit('/');await page.getByRole('link',{name:'Enter the Reserve',exact:true}).click();await page.waitForURL('**/home');
  assert.ok((await context.cookies()).some(c=>c.name==='reserve-arrival-v1'&&c.value==='seen'));
  await visit('/');assert.equal(new URL(page.url()).pathname,'/home');
  await page.getByText('Menu',{exact:true}).click();await page.getByRole('link',{name:'The Chair',exact:true}).focus();await page.keyboard.press('Escape');
  assert.equal(await page.locator('.experience-menu').getAttribute('open'),null);assert.equal(await page.locator('.experience-menu summary').evaluate(e=>e===document.activeElement),true);
  proofs.push('threshold/return cookie and Menu Escape/focus');
  await page.emulateMedia({reducedMotion:'reduce'});await visit('/?replay=1');await page.getByRole('link',{name:'Enter the Reserve',exact:true}).click();await page.waitForURL('**/home');assert.equal(await page.locator('.is-entering').count(),0);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await visit('/fix-it-shop');await page.getByRole('link',{name:'Get your chair ready',exact:true}).click();await page.waitForURL('**/chair');
  await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Skip this — no explanation needed',exact:true}).click();
  await page.getByRole('radio',{name:'Give me some quiet.',exact:true}).check();await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Back',exact:true}).click();assert.equal(await page.getByRole('radio',{name:'Give me some quiet.',exact:true}).isChecked(),true);
  proofs.push('Katie to Chair; optional life skip and Back retain selected preference');
  await visit('/sanctum-mirror');await page.getByRole('button',{name:'Begin your Blueprint',exact:true}).click();
  for(const name of ['Sharper beard structure','Five minutes or less','Redness or irritation','Wavy','Full beard'])await page.getByRole('button',{name,exact:true}).click();
  await page.getByRole('button',{name:'Review my Blueprint',exact:true}).click();
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('reserve:grooming-blueprint')),null,'review does not write a draft');
  await page.getByRole('button',{name:'Keep my Blueprint',exact:true}).click();await page.waitForURL('**/signin?next=/my-sanctum');await page.getByRole('button',{name:/Experience a client visit/}).click();await page.waitForURL('**/my-sanctum');
  await page.getByRole('button',{name:'Confirm & save my Blueprint',exact:true}).waitFor();
  let profile=await(await context.request.get(base+'/api/grooming-profile')).json();
  assert.deepEqual(profile.profile,beforeMirror,'sign-in does not replace existing profile');
  await page.getByRole('button',{name:'Confirm & save my Blueprint',exact:true}).click();await page.getByText('Your Grooming Blueprint is saved to your current Reserve account.',{exact:true}).waitFor();
  profile=await(await context.request.get(base+'/api/grooming-profile')).json();assert.equal(profile.profile.scan_completed_at,null);assert.match(profile.profile.blueprint.direction,/beard line/);
  proofs.push('Mirror review -> account -> explicit save; no auto-save; no completed-scan claim');
  // Book a synthetic service through the existing authoritative endpoints, then inspect owned continuity.
  let date=DateTime.now().setZone('America/Chicago').plus({days:2});while(![2,3,4,5,6].includes(date.weekday))date=date.plus({days:1});
  let slot,day;
  for(let i=0;i<7&&!slot;i++){day=date.plus({days:i}).toISODate();const result=await(await context.request.get(base+`/api/availability?service=signature&date=${day}`)).json();slot=result.slots?.[0];}
  assert.ok(slot);
  const booked=await context.request.post(base+'/api/appointments',{headers:{Origin:base},data:{serviceId:'signature',start:slot.start,note:'Synthetic continuity verification',requestKey:crypto.randomUUID()}});assert.equal(booked.status(),201);const appointment=(await booked.json()).appointment;
  await visit(`/my-visit?visit=${appointment.id}`);await page.getByRole('heading',{name:'Your time is set aside.'}).waitFor();await page.screenshot({path:`${out}/my-visit-360.png`,fullPage:true});
  const rebook=page.getByRole('link',{name:'Book this service again',exact:false});assert.equal(await rebook.getAttribute('href'),'/book?service=signature');
  await rebook.click();await page.waitForURL('**/book?service=signature');await page.locator('.service-option.selected').waitFor();assert.match(await page.locator('.service-option.selected').innerText(),/Signature grooming/);
  const other=await browser.newContext();await other.request.post(base+'/api/auth',{headers:{Origin:base},data:{action:'preview',identity:'preview-other'}});const otherPage=await other.newPage();const foreign=await otherPage.goto(base+`/my-visit?visit=${appointment.id}`);assert.ok([200,404].includes(foreign.status()));await otherPage.getByRole('heading',{name:'This visit isn’t available.'}).waitFor();assert.doesNotMatch(await otherPage.locator('main').innerText(),/Signature grooming/);await other.close();
  await context.request.patch(base+`/api/appointments/${appointment.id}`,{headers:{Origin:base},data:{action:'cancel',revision:appointment.revision}});await visit(`/my-visit?visit=${appointment.id}`);await page.getByRole('heading',{name:'This visit was cancelled.'}).waitFor();
  proofs.push('owned appointment -> preparation -> enabled-service rebook; foreign visit returns unavailable view without appointment data; cancelled state accurate');
  // Full UI booking with sign-in return; booking URLs preserve the chosen service and time.
  await context.request.post(base+'/api/auth',{headers:{Origin:base},data:{action:'signout'}});
  await visit('/book');await page.getByRole('button',{name:/Signature grooming/}).click();await page.getByRole('button',{name:'Find a time',exact:true}).click();
  await page.locator('input[type=date]').fill(day);await page.locator('.time-grid button').first().click();await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('link',{name:'Continue to sign in',exact:true}).click();await page.getByRole('button',{name:/Experience a client visit/}).click();await page.waitForURL('**/book?**');
  await page.locator('#visit-note').fill('Phase 2 browser booking proof');await page.getByRole('button',{name:'Reserve preview visit',exact:true}).click();await page.getByText('PREVIEW VISIT RESERVED',{exact:true}).waitFor();
  await page.getByRole('link',{name:/Prepare your visit/}).click();await page.waitForURL('**/my-visit?visit=**');await page.getByRole('heading',{name:'Your time is set aside.'}).waitFor();
  const uiAppointment=(await(await context.request.get(base+'/api/appointments')).json()).visits.find(a=>a.note==='Phase 2 browser booking proof'&&a.status==='confirmed');assert.ok(uiAppointment);
  assert.equal((await context.request.get(base+'/api/appointments?studio=true')).status(),403);
  assert.equal((await context.request.patch(base+`/api/appointments/${uiAppointment.id}`,{headers:{Origin:'https://untrusted.invalid'},data:{action:'cancel',revision:uiAppointment.revision}})).status(),403);
  await context.request.post(base+'/api/auth',{headers:{Origin:base},data:{action:'preview',identity:'preview-katie'}});
  await visit('/studio');await page.getByRole('heading',{name:'Your working day.'}).waitFor();await page.getByRole('button',{name:'All dates',exact:true}).click();
  const record=page.locator('.appointment').filter({hasText:uiAppointment.id.slice(0,8).toUpperCase()});await record.waitFor();
  await record.getByRole('button',{name:'Reschedule',exact:true}).click();
  let newDay=date.plus({days:8});while(![2,3,4,5,6].includes(newDay.weekday))newDay=newDay.plus({days:1});
  await record.locator('input[type=date]').fill(newDay.toISODate());await record.locator('.time-grid button').first().click();await record.getByRole('button',{name:'Confirm new time',exact:true}).click();await page.getByRole('status').filter({hasText:'rescheduled'}).waitFor();
  await record.getByRole('button',{name:'Cancel visit',exact:true}).click();await record.getByRole('button',{name:'Confirm cancellation',exact:true}).click();await page.getByRole('status').filter({hasText:'cancelled'}).waitFor();
  const final=(await(await context.request.get(base+'/api/appointments?studio=true')).json()).visits.find(a=>a.id===uiAppointment.id);assert.equal(final.status,'cancelled');assert.equal(final.price,uiAppointment.price);assert.equal(final.revision,uiAppointment.revision+2);
  proofs.push('full booking UI -> guest sign-in return -> visit hub; Katie schedule -> reschedule/cancel; client studio and cross-origin denied');
  const noScript=await browser.newContext({javaScriptEnabled:false,viewport:{width:360,height:640}});const staticPage=await noScript.newPage();await staticPage.goto(base+'/');assert.equal(await staticPage.getByRole('link',{name:'Enter the Reserve',exact:true}).getAttribute('href'),'/home');await noScript.close();
  const blocked=await browser.newContext();await blocked.addInitScript(()=>{Object.defineProperty(window,'sessionStorage',{get(){throw new DOMException('blocked','SecurityError');}});});const blockedPage=await blocked.newPage();await blockedPage.goto(base+'/sanctum-mirror');await blockedPage.getByRole('button',{name:'Begin your Blueprint',exact:true}).click();for(const name of ['Sharper beard structure','Five minutes or less','Redness or irritation','Wavy','Full beard'])await blockedPage.getByRole('button',{name,exact:true}).click();await blockedPage.getByRole('button',{name:'Review my Blueprint',exact:true}).click();await blockedPage.getByRole('button',{name:'Keep my Blueprint',exact:true}).click();assert.match(await blockedPage.locator('.error-message[role=alert]').innerText(),/couldn’t keep/);await blocked.close();
  proofs.push('no-JS arrival link and blocked-storage Mirror fallback');
  assert.deepEqual(errors,[]);
  await writeFile(`${out}/verification.json`,JSON.stringify({proofs,errors,physicalDeviceVerified:false,hostedOAuthVerified:false},null,2));
  console.log(proofs.join('\n'));
} catch(error) {await writeFile(`${out}/server-error.log`,log);throw error;} finally {await browser?.close();server.kill('SIGTERM');}
