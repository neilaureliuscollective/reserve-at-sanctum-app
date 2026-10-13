import {spawn} from "node:child_process";
import {randomUUID} from "node:crypto";
import {mkdir,writeFile} from "node:fs/promises";
import assert from "node:assert/strict";
import {chromium} from "@playwright/test";
import {assertSyntheticVerification} from "./synthetic-verification.mjs";
assertSyntheticVerification();
const origin="http://localhost:3000",artifacts="artifacts/founder-foundation";
const server=spawn(process.execPath,["node_modules/next/dist/bin/next","dev","--hostname","127.0.0.1","--port","3000"],{env:{...process.env,APP_ORIGIN:origin,RESERVE_DEV_PREVIEW:"true",RESERVE_BUSINESS_AUTHORITY_ENABLED:"false",RESERVE_PAYMENT_ASSOCIATION_ENABLED:"false",RESERVE_BOOKING_EMAIL_ENABLED:"false"},stdio:["ignore","pipe","pipe"]});
let logs="",browser;server.stdout.on("data",d=>logs+=d);server.stderr.on("data",d=>logs+=d);
await mkdir(artifacts,{recursive:true});
try{
 await new Promise((resolve,reject)=>{server.stdout.on("data",d=>{if(String(d).includes("Ready in"))resolve();});server.on("exit",c=>reject(Error("Server exit "+c)));setTimeout(()=>reject(Error("Startup timeout")),45000).unref();});
 browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:["--no-sandbox","--disable-dev-shm-usage"]});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on("pageerror",e=>errors.push(e.message));
 async function login(identity){await page.goto(origin+"/signin");assert.equal(await page.evaluate(async id=>(await fetch("/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"preview",identity:id})})).status,identity),200);}
 await login("preview-neil");await page.goto(origin+"/studio");await page.getByRole("heading",{name:"The platform, from actual records."}).waitFor();
 const slug="synthetic-"+randomUUID();
 await page.getByRole("link",{name:"Businesses",exact:true}).click();
 await page.getByLabel("Business display name").fill("Synthetic acceptance business");await page.getByLabel("Business identifier").fill(slug);
 await page.getByRole("button",{name:"Save closed draft"}).focus();await page.keyboard.press("Enter");
 await page.getByRole("status").filter({hasText:"Closed business draft saved"}).waitFor();
 await page.getByRole("heading",{name:"Synthetic acceptance business",exact:true}).waitFor();
 assert.match(await page.locator("main").innerText(),/Booking closed/);
 const directory=await page.evaluate(async()=>{const r=await fetch("/api/studio/businesses");return {status:r.status,...await r.json()};});
 assert.equal(directory.status,200);const created=directory.businesses.find(b=>b.slug===slug);assert.equal(created.verified_owners,0);assert.equal(created.professionals,0);assert.equal(created.subscription_status,"unconfigured");
 for(const route of ["/studio","/studio/businesses","/studio/support"]){
  await page.goto(origin+route);
  for(const width of [320,390,1440]){
   await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Overflow ${route} ${width}`);
   if(process.env.AXE_CORE_PATH){await page.addScriptTag({path:process.env.AXE_CORE_PATH});const audit=await page.evaluate(async()=>window.axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21a","wcag21aa"]}}));await writeFile(`${artifacts}/axe-${route.replaceAll("/","-")}-${width}.json`,JSON.stringify(audit));assert.deepEqual(audit.violations.map(v=>v.id),[]);}
  }
 }
 await page.emulateMedia({reducedMotion:"reduce"});await page.goto(origin+"/studio/businesses");await page.screenshot({path:`${artifacts}/business-mobile.png`});
 for(const identity of ["preview-katie","preview-client"]){await login(identity);assert.equal(await page.evaluate(async()=>(await fetch("/api/studio/businesses")).status),403);}
 assert.deepEqual(errors,[]);console.log("PASS real synthetic Founder overview, keyboard business draft creation, closed controls, unauthorized reads, mobile widths and optional axe audits.");
}finally{await browser?.close();server.kill("SIGTERM");await writeFile(`${artifacts}/server.log`,logs);}
