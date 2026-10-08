import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
if(process.env.DATABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL)throw Error('Synthetic verification is isolated local only');
const base='http://localhost:3117';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port','3117'],{env:{...process.env,RESERVE_DEV_PREVIEW:'true',APP_ORIGIN:base},stdio:['ignore','pipe','pipe']});
let log='',browser; server.stdout.on('data',d=>log+=d);server.stderr.on('data',d=>log+=d);
try{
 await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('Ready in'))resolve()});server.on('exit',()=>reject(Error(log)));setTimeout(()=>reject(Error(log)),30000).unref()});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
 const client=await browser.newContext(),other=await browser.newContext(),owner=await browser.newContext();
 const post=(ctx,path,data)=>ctx.request.post(base+path,{headers:{Origin:base},data});
 for(const [ctx,identity] of [[client,'preview-client'],[other,'preview-other'],[owner,'preview-neil']])assert.equal((await post(ctx,'/api/auth',{action:'preview',identity})).status(),200);
 const page=await client.newPage();page.setDefaultTimeout(30000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/pathways?priority=performance#routine');
 await page.getByLabel('Routine title').fill('My digital daily standard');
 await page.getByLabel('Your steps — one per line').fill('Prepare tomorrow’s essentials\nMake room for a comfortable movement break');
 await page.getByRole('button',{name:'Save routine',exact:true}).click();
 await page.getByRole('status').filter({hasText:'Your routine is saved'}).waitFor();
 const previous=await client.request.get(base+'/api/vitalis/journey').then(r=>r.json());
 const saved=await post(client,'/api/vitalis/journey',{direction:'sleep',minutes:5,target:3,revision:previous.journey?.revision??0,adult:true,consent:true,noticeVersion:'vitalis-pilot-2026-10-08'});
 assert.equal(saved.status(),200);
 const view=await saved.json();
 // Use the existing versioned private endpoint; no browser-supplied date or user ID.
 const check=await client.request.patch(base+'/api/vitalis/journey',{headers:{Origin:base},data:{revision:view.journey.revision,completed:true}});assert.equal(check.status(),200);
 await page.goto(base+'/home');await page.getByRole('heading',{name:'Welcome back, Jordan.'}).waitFor();
 await page.getByRole('heading',{name:'My digital daily standard'}).waitFor();
 await page.getByRole('heading',{name:'Give recovery a rhythm.'}).waitFor();
 await page.getByText('1 marked day this week · Target 3',{exact:true}).waitFor();
 assert.equal(await page.locator('.member-week span[data-completed=true]').count(),1);
 const privateOther=await other.request.get(base+'/api/vitalis/journey').then(r=>r.json());assert.equal(privateOther.journey,null);
 const routineOther=await other.request.get(base+'/api/routine').then(r=>r.json());assert.equal(routineOther.routine,null);
 await mkdir('artifacts/digital-member',{recursive:true});
 for(const width of [320,390,884,1440]){
  await page.setViewportSize({width,height:900});
  for(const path of ['/home','/pathways?priority=performance','/vitalis/journey']){
   await page.goto(base+path);await page.locator('main h1').waitFor();await page.waitForLoadState('networkidle');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${path} overflow ${width}`);
   if(path==='/home')await page.screenshot({path:`artifacts/digital-member/home-${width}.png`,fullPage:true});
  }
 }
 // The same dock works for customers and founders without changing private role routing.
 await page.goto(base+'/reserve'); await page.waitForURL('**/home');
 await page.goto(base+'/concierge'); await page.waitForURL('**/aethelios');
 assert.equal(await page.locator('.command-dock a[aria-current=page]').innerText(), 'Aethelios');
 await page.goto(base+'/visit');
 await page.getByRole('button',{name:/Katie/}).click();
 const serviceLink=page.locator('.sanctum-services').getByRole('link').first();
 const bookingHref=await serviceLink.getAttribute('href');
 assert.ok(bookingHref.includes('provider=katie'));
 await serviceLink.click(); await page.waitForURL('**/book?**');
 await page.getByRole('heading',{name:'With Katie.'}).waitFor();
 assert.ok(await page.locator('.service-option').count()>0);
 assert.ok((await page.locator('.service-option').allTextContents()).every(text=>text.includes('Katie')));
 assert.equal(await page.locator('.command-dock a[aria-current=page]').innerText(),'Sanctum');
 await page.goto(base+'/book?location=eunice&provider=nonexistent&service=signature');
 await page.getByRole('alert').filter({hasText:'This professional is not accepting'}).waitFor();
 assert.equal(await page.locator('.service-option').count(),0);
 assert.equal(await page.getByRole('button',{name:'Find a time'}).isDisabled(),true);
 // A stalled catalog must settle into a retryable error, rather than an endless loader.
 await page.route('**/api/availability?location=*', () => {});
 await page.goto(base+'/book?location=eunice');
 await page.getByRole('alert').filter({hasText:'Unable to load the service menu'}).waitFor();
 assert.equal(await page.getByText('Preparing the experience…', {exact:true}).count(),0);
 await page.unroute('**/api/availability?location=*');
 const founder=await owner.newPage();
 await founder.goto(base+'/home');await founder.waitForURL('**/studio');
 for(const path of ['/discover','/discover/membership','/discover/aethelios','/home?explore=1']){await founder.goto(base+path);await founder.locator('main h1').waitFor();assert.equal(new URL(founder.url()).pathname,path.split('?')[0]);}
 await founder.getByRole('heading',{name:'A standard to return to.'}).waitFor();
 assert.equal(await founder.locator('.member-week span').count(),0,'founder public preview cannot project customer wellness records');
 await founder.goto(base+'/reserve'); await founder.waitForURL('**/home?explore=1');
 await founder.goto(base+'/concierge'); await founder.waitForURL('**/discover/aethelios');
 for(const width of [320,390,884,1440]) {
  await page.setViewportSize({width,height:660}); await page.goto(base+'/visit'); await page.waitForLoadState('networkidle');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Sanctum overflow ${width}`);
  assert.equal(await page.locator('.command-dock a').count(),5);
  await page.getByRole('button',{name:/Katie/}).click(); await page.waitForTimeout(800);
  const servicesTitle=await page.getByRole('heading',{name:'With Katie.'}).boundingBox();
  assert.ok(servicesTitle.y>=0 && servicesTitle.y+servicesTitle.height<(await page.locator('.command-dock').boundingBox()).y, 'provider selection must reveal services above dock');
  await page.screenshot({path:`artifacts/digital-member/sanctum-${width}.png`,fullPage:true});
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: saved routine and actual wellness check-ins on Home; account isolation; 320px/phone/Fold/desktop member layouts; genuine tool handoffs; founder public preview with no customer data; unchanged Studio role routing');
}catch(e){console.log(log);throw e;}finally{await browser?.close();server.kill();}
