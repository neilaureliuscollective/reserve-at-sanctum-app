import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
if(process.env.DATABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL)throw Error('Run without hosted credentials');
await mkdir('artifacts/katie-world',{recursive:true});
const port=3128,base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env:{...process.env,RESERVE_DEV_PREVIEW:'false'},stdio:['ignore','pipe','pipe']});
let logs='',browser,page;server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);
try{
 await new Promise((resolve,reject)=>{server.stdout.on('data',d=>String(d).includes('Ready')&&resolve());server.on('exit',()=>reject(Error(logs)));setTimeout(()=>reject(Error(logs)),30000).unref()});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext();page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [width,height] of [[320,660],[390,660],[390,844],[884,900],[1440,1000]]){
  console.log(`Checking Katie ${width}x${height}`);await page.setViewportSize({width,height});await page.goto(base+'/fix-it-shop');await page.locator('#katie-title').waitFor();await page.waitForTimeout(200);
  assert.ok(await page.locator('.katie-hero').getByText('FOUNDER & OWNER OF FIX IT SHOP',{exact:true}).isVisible());
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow');
  await page.locator('.katie-hero__image').evaluate(el=>el.decode());
  if(width<=700){const cta=await page.locator('.katie-hero .button-gold').boundingBox(),dock=await page.locator('.command-dock').boundingBox();assert.ok(cta.y>=0&&cta.y+cta.height<dock.y-4,`hero CTA blocked ${width}x${height}: ${JSON.stringify(cta)} dock ${dock.y}`)}
  await page.screenshot({path:`artifacts/katie-world/hero-${width}-${height}.png`});
  await page.locator('#founder').evaluate(el=>scrollTo({top:scrollY+el.getBoundingClientRect().top,behavior:'instant'}));const shortcut=page.locator('.katie-booking-shortcut');await shortcut.waitFor();const rect=await shortcut.boundingBox(),dock=await page.locator('.command-dock').boundingBox();assert.ok(rect.y+rect.height<dock.y-6,'shortcut overlaps dock');
  await page.locator('.katie-hero .button-gold').click();await page.waitForTimeout(150);
  assert.equal(await page.locator('#services').getAttribute('data-booking-state'),'preparing');assert.equal(await page.locator('.katie-service-menu a').count(),0);
  assert.ok(await page.getByText('THE MENU IS TAKING SHAPE',{exact:true}).isVisible());
  await page.locator('#services').scrollIntoViewIfNeeded();await page.waitForTimeout(200);
  await page.locator('.katie-booking-shortcut').waitFor({state:'hidden'});
  await page.screenshot({path:`artifacts/katie-world/services-${width}-${height}.png`});
  await page.locator('#the-chair').scrollIntoViewIfNeeded();await page.getByRole('button',{name:'Quiet time',exact:true}).focus();await page.keyboard.press('Space');assert.equal(await page.getByRole('button',{name:'Quiet time',exact:true}).getAttribute('aria-pressed'),'true');assert.ok((await page.locator('.katie-choice__response').innerText()).includes('without having to fill the silence'));
  await page.getByRole('button',{name:"Let's talk",exact:true}).click();assert.equal(await page.getByRole('button',{name:"Let's talk",exact:true}).getAttribute('aria-pressed'),'true');
  await page.screenshot({path:`artifacts/katie-world/chair-${width}-${height}.png`});
 }
 await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/fix-it-shop');await page.locator('.katie-film[data-motion=true]').waitFor();
 for(const [progress,active] of [[.1,'1'],[.47,'2'],[.9,'3']]){await page.locator('.katie-film').evaluate((el,p)=>scrollTo({top:scrollY+el.getBoundingClientRect().top+p*(el.offsetHeight-innerHeight),behavior:'instant'}),progress);await page.waitForTimeout(150);assert.equal(await page.locator('.katie-film').getAttribute('data-active'),active);assert.equal(await page.locator('.katie-film__chapter:not([aria-hidden=true])').count(),1)}
 await page.getByRole('button',{name:'Show the still view',exact:true}).click();await page.locator('.katie-film[data-motion=false]').waitFor();assert.equal(await page.locator('.katie-film__chapter[inert]').count(),0);
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.locator('.katie-film[data-motion=false]').waitFor();assert.equal(await page.locator('.katie-film__chapter[aria-hidden=true]').count(),0);
 const booking=await context.request.get(base+'/book?location=eunice&provider=katie');assert.ok(booking.ok());
 const hrefs=await page.locator('main a[href^="/"]').evaluateAll(els=>els.map(el=>el.getAttribute('href')));for(const href of new Set(hrefs)){assert.ok((await context.request.get(base+href)).status()<400,`broken route ${href}`)}
 await page.goto(base+'/visit');assert.ok(await page.getByText('KATIE GUIDRY / FOUNDER OF FIX IT SHOP',{exact:true}).isVisible());
 await page.goto(base+'/fix-it-shop');await page.locator('#katie-title').waitFor();await page.screenshot({path:'artifacts/katie-world/desktop-full.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: founder identity; 320/390/short phone/Fold/desktop; hero CTA and shortcut dock clearance; published-menu preparation; Chair keyboard preferences; cinematic chapters; still/reduced motion; public route handoffs; Sanctum identity; zero runtime errors');
}catch(e){console.log(logs);if(page){await page.screenshot({path:'artifacts/katie-world/failure.png'});console.log(await page.evaluate(()=>['.katie-hero','#services','#founder'].map(s=>({selector:s,rect:document.querySelector(s).getBoundingClientRect().toJSON()}))))}throw e}finally{await browser?.close();server.kill()}
