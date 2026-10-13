import { assertSyntheticVerification } from "./synthetic-verification.mjs";
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
assertSyntheticVerification();
const origin="http://localhost:3000", artifacts="artifacts/founder-command";
const server=spawn(process.execPath,["node_modules/next/dist/bin/next","dev","--hostname","127.0.0.1","--port","3000"],{env:{...process.env,RESERVE_DEV_PREVIEW:"true",APP_ORIGIN:origin,RESERVE_BOOKING_EMAIL_ENABLED:"false",RESERVE_BOOKING_CRON_ENABLED:"false"},stdio:["ignore","pipe","pipe"]});
let logs="",browser;
server.stdout.on("data",d=>logs+=d);server.stderr.on("data",d=>logs+=d);
await mkdir(artifacts,{recursive:true});
try {
 await new Promise((resolve,reject)=>{server.stdout.on("data",d=>{if(String(d).includes("Ready in"))resolve();});server.on("exit",c=>reject(Error("Server exit "+c)));setTimeout(()=>reject(Error("Startup timeout")),45000).unref();});
 browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:["--no-sandbox","--disable-dev-shm-usage"]});
 const page=await browser.newPage({viewport:{width:390,height:844}}), errors=[];page.on("pageerror",e=>errors.push(e.message));
 async function login(identity){await page.goto(origin+"/fix-it-shop/app/signin");const response=await page.evaluate(async identity=>{const r=await fetch("/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"preview",identity})});return r.status;},identity);assert.equal(response,200);}
 await login("preview-neil");await page.goto(origin+"/studio");
 await page.getByRole("heading",{name:"Founder Command."}).waitFor();
 assert.match(await page.locator("main").innerText(),/Not verified/);
 await page.getByLabel("Booking message",{exact:true}).selectOption("cancel");
 assert.match(await page.getByLabel("Synthetic email preview").innerText(),/Appointment cancelled/);
 await page.getByLabel("Time-zone rehearsal").selectOption("winter");assert.match(await page.getByLabel("Synthetic email preview").innerText(),/CST/);
 await page.getByLabel("Customer experience").selectOption("guest");assert.match(await page.getByLabel("Synthetic email preview").innerText(),/usual contact method/);
 await page.getByRole("button",{name:"Rehearse template locally"}).focus();await page.keyboard.press("Enter");assert.match(await page.locator('[role="status"]').innerText(),/No email was sent/);
 for(const width of [320,390,540,768,884,1440]){
  await page.setViewportSize({width,height:900});await page.evaluate(()=>scrollTo(0,0));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Overflow at ${width}`);
  if(process.env.AXE_CORE_PATH){await page.addScriptTag({path:process.env.AXE_CORE_PATH});const audit=await page.evaluate(async()=>window.axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21a","wcag21aa"]}}));await writeFile(`${artifacts}/axe-${width}.json`,JSON.stringify(audit));assert.deepEqual(audit.violations.map(v=>v.id),[],`Accessibility at ${width}`);}
  await page.screenshot({path:`${artifacts}/command-${width}.png`,fullPage:true});
 }
 await page.reload();await page.getByRole("heading",{name:"Founder Command."}).waitFor(); // session persistence
 assert.equal(await page.evaluate(async()=> (await fetch("/api/internal/booking-messages")).status),503);
 assert.equal(await page.evaluate(async()=> (await fetch("/api/chair/studio")).status),403);
 await login("preview-katie");await page.goto(origin+"/studio");await page.waitForURL("**/studio/today");assert.equal(await page.getByRole("heading",{name:"Founder Command."}).count(),0);
 await login("preview-client");await page.goto(origin+"/studio");await page.getByRole("heading",{name:"A space for the team."}).waitFor();assert.equal(await page.getByRole("heading",{name:"Founder Command."}).count(),0);
 assert.deepEqual(errors,[]);
 console.log("PASS Founder Command real synthetic DB/session, shared template previews, keyboard rehearsal, founder/operator/customer routes, disabled delivery, no overflow at six widths and no page errors.");
} finally {await browser?.close();server.kill("SIGTERM");await writeFile(`${artifacts}/server.log`,logs);}
