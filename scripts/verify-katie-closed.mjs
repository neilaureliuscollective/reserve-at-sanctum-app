import { waitForApplication } from "./wait-for-application.mjs";
import { assertSyntheticVerification } from "./synthetic-verification.mjs";
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir,writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
assertSyntheticVerification();
const origin="http://localhost:3000",dir="artifacts/katie-closed";
await mkdir(dir,{recursive:true});
// Real unconfigured server: no database, no Auth, no native preview bypass.
const server=spawn(process.execPath,["node_modules/next/dist/bin/next","dev","--hostname","127.0.0.1","--port","3000"],{env:{...process.env,RESERVE_DEV_PREVIEW:"false",RESERVE_KATIE_CALENDAR:"glossgenius",APP_ORIGIN:origin,RESERVE_BOOKING_EMAIL_ENABLED:"false",RESERVE_BOOKING_CRON_ENABLED:"false"},stdio:["ignore","pipe","pipe"]});
let logs="",browser;server.stdout.on("data",d=>logs+=d);server.stderr.on("data",d=>logs+=d);
try{
 await new Promise((resolve,reject)=>{server.stdout.on("data",d=>{if(String(d).includes("Ready in"))resolve();});server.on("exit",c=>reject(Error("Server exit "+c)));setTimeout(()=>reject(Error("Startup timeout")),45000).unref();});
 await waitForApplication(origin);
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || "/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage"]});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],audits=[];page.on("pageerror",e=>errors.push(e.message));
 await page.route("**/*",route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 for(const path of ["/fix-it-shop/app","/fix-it-shop","/book","/book?provider=katie","/fix-it-shop/app/book"]){
  await page.goto(origin+path);await page.getByRole("link",{name:/Continue to GlossGenius/}).waitFor();
  assert.equal(await page.getByRole("link",{name:/Continue to GlossGenius/}).getAttribute("href"),"https://fixitshop.glossgenius.com/");
  assert.equal(await page.locator(".service-option,.fis-service").count(),0);
  assert.match(await page.locator(".booking-status-panel").innerText(),/current booking calendar/);
 }
 for(const width of [320,390,540,768,884,1440]){
  await page.setViewportSize({width,height:900});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Closed booking overflow ${width}`);
  assert.ok(await page.locator(".booking-status-panel p").evaluate(el=>el.getBoundingClientRect().width>200));
  if(process.env.AXE_CORE_PATH){await page.addScriptTag({path:process.env.AXE_CORE_PATH});const audit=await page.evaluate(async()=>window.axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21a","wcag21aa"]}}));assert.deepEqual(audit.violations.map(v=>v.id),[],`Closed accessibility ${width}`);audits.push({width,violations:0});}
  if([390,1440].includes(width))await page.screenshot({path:`${dir}/closed-${width}.png`,fullPage:true});
 }
 const catalog=await (await page.request.get(origin+"/api/availability")).json();assert.deepEqual(catalog.services,[]);assert.equal(catalog.katieNativeCalendar,false);assert.equal(catalog.setupRequired,true);
 await page.goto(origin+"/book?provider=other");
 await page.getByText("Booking is temporarily unavailable. Check your appointments or contact your professional before trying again.",{exact:true}).waitFor();
 assert.equal(await page.getByRole("link",{name:/Continue to GlossGenius/}).count(),0,"Other professionals do not inherit Katie's fallback");
 assert.equal((await page.request.get(origin+"/api/internal/booking-messages")).status(),503);
 assert.deepEqual(errors,[]);await writeFile(`${dir}/results.json`,JSON.stringify({state:"unconfigured",fixtures:"none",nativeBooking:false,email:false,scheduler:false,audits},null,2));
 console.log(`PASS unconfigured public home/story/booking use only GlossGenius; no fixtures or hosted credentials; ${audits.length} accessibility audits.`);
}finally{await browser?.close();server.kill("SIGTERM");await writeFile(`${dir}/server.log`,logs);}
