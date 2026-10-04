import {spawn} from 'node:child_process';
import {DateTime} from 'luxon';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const origin=process.env.VERIFY_ORIGIN||'http://localhost:3007';
if(!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))throw Error('Synthetic local verification only.');
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',new URL(origin).port],{env:{...process.env,RESERVE_DEV_PREVIEW:'true',RESERVE_VERIFY:'true',RESERVE_PREVIEW_PATH:`.data/verify-${Date.now()}`,APP_ORIGIN:origin},stdio:['ignore','pipe','pipe']});
let serverLog='';server.stdout.on('data',d=>serverLog+=d);server.stderr.on('data',d=>serverLog+=d);
await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('Ready in'))resolve();});server.on('exit',()=>reject(Error(serverLog)));setTimeout(()=>reject(Error('Startup timeout')),30000).unref();});
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
await mkdir('artifacts',{recursive:true});
const errors=[];const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));
async function post(path,input){const r=await page.request.post(origin+path,{headers:{Origin:origin},data:input});const d=await r.json();assert.ok(r.ok(),JSON.stringify(d));return d;}
try{
 await page.goto(origin+'/signin?next=/studio');await page.getByRole('button',{name:'Open Neil’s owner view'}).click();await page.waitForURL('**/studio');await page.getByRole('heading',{name:'Your location. In rhythm.'}).waitFor();
 await page.getByRole('button',{name:'location',exact:true}).click();await page.getByLabel('Configure',{exact:true}).selectOption('new location');
 const slug=`verify-location-${Date.now()}`;
 await page.getByLabel('Location name',{exact:true}).fill('Reserve verification location');await page.getByLabel('URL slug',{exact:true}).fill(slug);await page.getByRole('button',{name:'Save new location'}).click();
 await page.getByLabel('Location',{exact:true}).getByRole('option',{name:'Reserve verification location'}).waitFor({state:'attached'});
 await page.getByLabel('Location',{exact:true}).selectOption(slug);
 await page.getByRole('button',{name:'location',exact:true}).click();await page.getByLabel('Configure',{exact:true}).selectOption('provider');
 await page.getByLabel('Provider name',{exact:true}).fill('Verification provider');await page.getByLabel('Provider URL slug',{exact:true}).fill(`verify-provider-${Date.now()}`);await page.getByLabel('Optional provider brand').fill('Independent provider brand');await page.getByLabel('Enabled',{exact:true}).check();await page.getByRole('button',{name:'Save provider'}).click();await page.getByRole('status').getByText('Saved.').waitFor();
 const cfg=await (await page.request.get(origin+`/api/configuration?location=${slug}`)).json();assert.equal(cfg.providers[0].brand_name,'Independent provider brand');
 const visitDay=DateTime.now().setZone('America/Chicago').plus({days:2});const providerId=cfg.providers[0].id;
 await post('/api/configuration',{action:'location',id:slug,name:'Reserve verification location',slug,timezone:'America/Chicago',status:'pilot',booking_enabled:true,revision:cfg.location.revision});
 for(const p of [null,providerId])await post('/api/configuration',{action:'hours',locationId:slug,providerId:p,weekday:visitDay.weekday,intervals:[{start:540,end:1020}]});
 const service=await post('/api/configuration',{action:'service',locationId:slug,providerId,name:'Verification service',minutes:45,buffer:15,price:5000,enabled:true});
 await page.getByLabel('Day',{exact:true}).fill(visitDay.toISODate());await page.getByRole('button',{name:'Book for a guest',exact:true}).click();
 await page.getByText('Add a guest',{exact:true}).click();await page.getByLabel('Name',{exact:true}).fill('Verification guest');await page.getByLabel('Email',{exact:true}).fill('verification@example.test');await page.getByRole('button',{name:'Create guest'}).click();await page.getByRole('status').getByText('Saved.').waitFor();
 await page.getByLabel('Service',{exact:true}).selectOption(service.id);await page.getByLabel('Available time',{exact:true}).getByRole('option').nth(1).waitFor({state:'attached'});const time=await page.getByLabel('Available time',{exact:true}).getByRole('option').nth(1).getAttribute('value');await page.getByLabel('Available time',{exact:true}).selectOption(time);
 await page.getByRole('button',{name:'Reserve visit',exact:true}).click();await page.getByRole('heading',{name:'Verification guest',exact:true}).waitFor();
 await page.screenshot({path:'artifacts/operations-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/operations-mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Mobile horizontal overflow');
 const unauth=await browser.newContext();const denied=await unauth.request.get(origin+'/api/configuration');assert.equal(denied.status(),401);await unauth.close();
 await post('/api/auth',{action:'preview',identity:'preview-client'});const clientDenied=await page.request.get(origin+`/api/configuration?location=${slug}`);assert.equal(clientDenied.status(),403);
 await page.goto(origin+'/studio');await page.waitForURL('**/account');await page.goto(origin+'/book');await page.getByRole('heading').first().waitFor();
 assert.equal(errors.length,0,errors.join('\n'));await writeFile('artifacts/operations-verification.json',JSON.stringify({passed:true,checks:['owner sign-in','location creation through UI','provider and optional brand configuration','guest creation and staff booking through UI','mobile overflow','unauthenticated rejection','customer configuration denial','customer studio redirect'],errors},null,2));console.log('Operations browser verification passed.');
}catch(e){await page.screenshot({path:'artifacts/operations-failure.png',fullPage:true});console.error(await page.locator('body').innerText());throw e;}finally{await browser.close();server.kill('SIGTERM');await writeFile('artifacts/operations-server.log',serverLog);}
