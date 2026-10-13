import { assertSyntheticVerification } from "./synthetic-verification.mjs";
import { chromium } from "@playwright/test";
import { spawn, execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { DateTime } from "luxon";
import assert from "node:assert/strict";
assertSyntheticVerification();
const origin="http://localhost:3000", base="/fix-it-shop/app", artifacts="artifacts/katie-launch";
await mkdir(artifacts,{recursive:true});
// Only isolated .data PGlite, never a hosted fixture or Katie's approved catalog.
execFileSync(process.execPath,["--import","tsx","--input-type=module","-e",`
 import {PGlite} from '@electric-sql/pglite';
 import {schema,seed,wrapPglite} from './lib/db.ts';
 const pg=new PGlite('.data/reserve');await pg.waitReady;const db=wrapPglite(pg);await schema(db);await seed(db);
 for(const minutes of [20,25,70]) await db.query("INSERT INTO reserve_services(id,provider_id,name,description,minutes,buffer,price,enabled) VALUES($1,'katie',$2,'Synthetic fixture only',$3,5,3000,true) ON CONFLICT(id) DO UPDATE SET minutes=EXCLUDED.minutes,buffer=5,enabled=true",['launch-'+minutes,'Synthetic '+minutes+' minute visit',minutes]);
 await pg.close();
`],{stdio:"pipe"});
const server=spawn(process.execPath,["node_modules/next/dist/bin/next","dev","--hostname","127.0.0.1","--port","3000"],{env:{...process.env,RESERVE_DEV_PREVIEW:"true",APP_ORIGIN:origin,RESERVE_BOOKING_EMAIL_ENABLED:"false",RESERVE_BOOKING_CRON_ENABLED:"false"},stdio:["ignore","pipe","pipe"]});
let logs="",browser;server.stdout.on("data",d=>logs+=d);server.stderr.on("data",d=>logs+=d);
const checks=[], audits=[];
const record=checks.push.bind(checks);checks.push=(message)=>{console.log("PASS "+message);return record(message);};
try {
 await new Promise((resolve,reject)=>{server.stdout.on("data",d=>{if(String(d).includes("Ready in"))resolve();});server.on("exit",c=>reject(Error("Server exit "+c)));setTimeout(()=>reject(Error("Startup timeout")),45000).unref();});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || "/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage"]});
 const context=await browser.newContext({viewport:{width:390,height:844}}), page=await context.newPage(), errors=[];
 page.setDefaultTimeout(25000);page.on("pageerror",e=>errors.push(e.message));
 await context.route("**/*",route=>new URL(route.request().url()).origin===origin ? route.continue() : route.abort());
 async function api(path,method="GET",data) {return context.request.fetch(origin+path,{method,headers:{Origin:origin},...(data?{data}:{} )});}
 async function login(identity){assert.equal((await api("/api/auth","POST",{action:"preview",identity})).status(),200);}
 async function clearPointer(){await page.evaluate(()=>sessionStorage.removeItem("reserve.booking-request.v1"));}
 async function select(minutes=25){
   let day=DateTime.now().setZone("America/Chicago").startOf("day").plus({days:18});
   for(let i=0;i<20;i++,day=day.plus({days:1})) {
     const data=await (await api(`/api/availability?service=launch-${minutes}&date=${day.toISODate()}&location=eunice`)).json();
     if(data.slots?.length){const start=data.slots[0].start;await page.goto(origin+base+"/book?"+new URLSearchParams({service:`launch-${minutes}`,date:day.toISODate(),start}));await page.getByRole("button",{name:"Reserve preview visit"}).waitFor();return start;}
   }throw Error("No synthetic availability");
 }
 const reserve=()=>page.getByRole("button",{name:"Reserve preview visit"});
 const saved=()=>page.getByRole("heading",{name:/Time set aside/});
 await login("preview-client");await page.goto(origin+base+"/book");await clearPointer();
 const start=await select();await page.getByLabel("Anything you’d like your provider to know?").fill("Synthetic private draft canary");
 let original, posts=0;
 await page.route("**/api/appointments",async route=>{
   if(route.request().method()!=="POST")return route.continue();
   posts++;original=route.request().postDataJSON();const response=await route.fetch();assert.equal(response.status(),201);await route.abort("failed");
 });
 await reserve().dblclick();await saved().waitFor();
 assert.equal(posts,1);assert.match(await page.locator(".booking-success").innerText(),/25 minutes/);
 assert.match(await page.locator('[data-notification-status="queued"]').innerText(),/delivery has not been confirmed/);
 const pointer=await page.evaluate(()=>sessionStorage.getItem("reserve.booking-request.v1"));
 assert.doesNotMatch(pointer,/private draft|launch-25|starts_at|note/);
 await page.reload();await saved().waitFor();assert.equal(posts,1);
 const retry=await api("/api/appointments","POST",original);assert.equal(retry.status(),201);
 const owned=await (await api("/api/appointments")).json();assert.equal(owned.visits.filter(v=>v.starts_at===start).length,1);
 checks.push("Lost committed response, double click, reload and same-key retry produce one real synthetic appointment; no draft in storage");
 await page.screenshot({path:`${artifacts}/saved-mobile.png`,fullPage:true});
 await page.unroute("**/api/appointments");
 await page.getByRole("button",{name:"Book another visit"}).click();await select(20);
 let delayed;
 await page.route("**/api/appointments",async route=>{delayed=route.request().postDataJSON();await route.abort("failed");});
 await reserve().click();await page.getByText(/No appointment was saved for this request/).waitFor();
 assert.equal((await api("/api/appointments","POST",delayed)).status(),409);
 await page.getByLabel("Anything you’d like your provider to know?").fill("Changed intent after settled failure");
 await page.unroute("**/api/appointments");await reserve().click();await saved().waitFor();
 checks.push("Pre-commit interruption retires old key, rejects late POST, and permits reviewed changed intent");
 await page.getByRole("button",{name:"Book another visit"}).click();await select(70);
 let held, committed;
 const gate=new Promise(resolve=>held=resolve);
 await page.route("**/api/appointments",async route=>{const response=await route.fetch();assert.equal(response.status(),201);committed=route.request().postDataJSON();await gate;await route.abort("failed").catch(()=>{});});
 await reserve().click();await page.waitForFunction(()=>!!sessionStorage.getItem("reserve.booking-request.v1"));
 const commitDeadline=Date.now()+20000;
 while(!committed && Date.now()<commitDeadline)await new Promise(r=>setTimeout(r,50));
 assert.ok(committed,"Synthetic commit did not complete");
 await page.reload();await saved().waitFor();held();await page.unroute("**/api/appointments");
 checks.push("Reload during an interrupted POST recovers exact 70-minute committed appointment");
 await page.getByRole("button",{name:"Book another visit"}).click();await select();
 await context.setOffline(true);await reserve().click();await page.getByText("Your booking outcome is still unknown.",{exact:true}).waitFor();
 assert.equal(await page.locator("[data-booking-submit]").isDisabled(),true);
 await context.setOffline(false);await page.getByText(/No appointment was saved for this request/).waitFor();
 checks.push("Offline submission becomes bounded unknown state, blocks another submission, and safely recovers on reconnect");
 await page.screenshot({path:`${artifacts}/recovered-not-saved.png`,fullPage:true});
 await select();
 await context.clearCookies();await reserve().click();await page.getByText(/Your session expired/).waitFor();
 await login("preview-other");await page.getByRole("button",{name:"Check booking request"}).click();await page.getByText(/A booking request belongs to a different/).waitFor();
 assert.equal(await page.locator("[data-booking-submit]").isDisabled(),true);
 await login("preview-client");await page.getByRole("button",{name:"Check booking request"}).click();await page.getByText(/No appointment was saved for this request/).waitFor();
 checks.push("Expired session and switched account never lose or settle another account's pointer; original account can resume");
 // Change the real cookie after the pointer is written but BEFORE fetch creates
 // the network request. This is distinct from switching after a 401 response.
 const switchedStart=await select();
 await page.exposeFunction("switchBookingAccountForTest",()=>login("preview-other"));
 await page.evaluate(()=>{
   const originalFetch=window.fetch;let once=true;
   window.fetch=async(...args)=>{
     if(once && args[0]==="/api/appointments"){
       once=false;await window.switchBookingAccountForTest();
       window.fetch=originalFetch;
     }
     return originalFetch(...args);
   };
 });
 let switchedCreate, switchedStatus;
 await page.route("**/api/appointments",async route=>{
   switchedCreate=route.request().postDataJSON();
   const response=await route.fetch();switchedStatus=response.status();
   await route.abort("failed"); // Lose even the mismatch response.
 });
 await reserve().click();await page.getByText(/A booking request belongs to a different/).waitFor();
 assert.equal(switchedStatus,403);assert.equal(switchedCreate.actorId,"preview-client");
 assert.equal(JSON.parse(await page.evaluate(()=>sessionStorage.getItem("reserve.booking-request.v1"))).actorId,"preview-client");
 assert.equal(await page.locator("[data-booking-submit]").isDisabled(),true);
 await page.unroute("**/api/appointments");
 assert.equal((await api("/api/appointments","POST",switchedCreate)).status(),403,"B cannot create A's request");
 assert.equal((await (await api("/api/appointments")).json()).visits.filter(v=>v.starts_at===switchedStart).length,0,"No hidden B appointment");
 await login("preview-client");await page.getByRole("button",{name:"Check booking request"}).click();await page.getByText(/No appointment was saved for this request/).waitFor();
 assert.equal((await (await api("/api/appointments")).json()).visits.filter(v=>v.starts_at===switchedStart).length,0,"No A appointment");
 assert.equal((await api("/api/appointments","POST",switchedCreate)).status(),409,"A's now-retired request stays closed");
 checks.push("Cookie switches A to B between pointer persistence and POST; lost mismatch response recovers without a hidden booking under either account");
 // A timeout must release loading while retaining the unresolved key.
 let releaseRecovery;
 const stalled=new Promise(resolve=>releaseRecovery=resolve);
 await page.route("**/api/appointments",route=>route.abort());
 await page.route("**/api/appointments/recover",async route=>{await stalled;await route.abort().catch(()=>{});});
 await reserve().click();await page.getByText("Your booking outcome is still unknown.",{exact:true}).waitFor({timeout:20000});
 await page.screenshot({path:`${artifacts}/uncertain-mobile.png`,fullPage:true});
 releaseRecovery();await page.unroute("**/api/appointments/recover");await page.unroute("**/api/appointments");
 await page.getByRole("button",{name:"Check booking request"}).click();await page.getByText(/No appointment was saved for this request/).waitFor();
 checks.push("12-second recovery timeout leaves explicit uncertainty and a usable retry, never indefinite loading or false failure");
 for(const width of [320,390,540,768,884,1440]){
   await page.setViewportSize({width,height:900});await page.goto(origin+base+"/book");await page.locator(".service-option").first().waitFor();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Booking overflow at ${width}`);
   if(process.env.AXE_CORE_PATH){await page.addScriptTag({path:process.env.AXE_CORE_PATH});const audit=await page.evaluate(async()=>window.axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21a","wcag21aa"]}}));assert.deepEqual(audit.violations.map(v=>v.id),[],`Booking accessibility ${width}`);audits.push({page:"book",width,violations:0});}
 }
 await page.setViewportSize({width:390,height:844});
 await page.route("**/api/availability?**",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({services:[],setupRequired:true,katieNativeCalendar:false})}));
 await page.goto(origin+base+"/book");await page.getByRole("link",{name:/Continue to GlossGenius/}).waitFor();assert.equal(await page.locator(".service-option").count(),0);
 await page.screenshot({path:`${artifacts}/closed-fallback-mobile.png`,fullPage:true});
 for(const width of [320,390,540,768,884,1440]) {
   await page.setViewportSize({width,height:900});
   assert.ok(await page.locator(".booking-status-panel p").evaluate(el=>el.getBoundingClientRect().width>200),"Fallback text must remain readable");
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Fallback overflow ${width}`);
   if(process.env.AXE_CORE_PATH){await page.addScriptTag({path:process.env.AXE_CORE_PATH});const audit=await page.evaluate(async()=>window.axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21a","wcag21aa"]}}));assert.deepEqual(audit.violations.map(v=>v.id),[],`Fallback accessibility ${width}`);audits.push({page:"closed-fallback",width,violations:0});}
 }
 await page.setViewportSize({width:390,height:844});
 checks.push("Closed native catalog shows exact GlossGenius destination and no parallel native menu (synthetic response fixture)");
 await page.unroute("**/api/availability?**");
 await page.route("**/api/availability?**",route=>route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({services:[],error:"Temporarily unavailable",katieNativeCalendar:true})}));
 await page.goto(origin+base+"/book");await page.getByRole("link",{name:"Contact Katie through her existing site"}).waitFor();
 assert.equal(await page.getByRole("link",{name:/Continue to GlossGenius/}).count(),0);
 await page.screenshot({path:`${artifacts}/native-outage-mobile.png`,fullPage:true});
 checks.push("Native calendar outage provides recovery/contact guidance without reopening competing GlossGenius availability (synthetic response fixture)");
 await page.unroute("**/api/availability?**");
 await page.goto(origin+"/privacy");assert.match(await page.locator("main").innerText(),/Platform-owner status does not grant access/);
 await page.screenshot({path:`${artifacts}/chair-privacy-mobile.png`,fullPage:true});
 for(const path of [base,base+"/founder",base+"/book",base+"/appointments","/chair","/studio","/privacy"]){
   const response=await page.goto(origin+path);assert.match(response.headers()["x-robots-tag"],/noindex/);assert.match(await page.locator('meta[name="robots"]').getAttribute("content"),/noindex/);
   assert.equal(await page.locator('link[rel="canonical"]').count(),0,`preview canonical ${path}`);
 }
 assert.match(await (await api("/robots.txt")).text(),/Disallow: \//);
 checks.push("Public previews, private routes and robots remain excluded from indexing; no preview canonical");
 assert.equal((await api("/api/internal/booking-messages")).status(),503);
 await login("preview-neil");assert.equal((await api("/api/chair/studio")).status(),403);
 await login("preview-katie");assert.equal((await api("/api/chair/studio")).status(),200);
 checks.push("Actual synthetic sessions preserve founder Chair denial and Katie's scoped access; delivery worker remains closed");
 assert.deepEqual(errors,[]);
 await writeFile(`${artifacts}/results.json`,JSON.stringify({checks,audits,evidence:"isolated synthetic PGlite/browser; fallback response mocked; no hosted, inbox or physical device acceptance"},null,2));
 console.log(`PASS ${checks.length} Katie launch journeys; ${audits.length} accessibility audits; screenshots in ${artifacts}`);
} finally {await browser?.close();server.kill("SIGTERM");await writeFile(`${artifacts}/server.log`,logs);}
