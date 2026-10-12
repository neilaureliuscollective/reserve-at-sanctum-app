import { assertSyntheticVerification } from "./synthetic-verification.mjs";
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { DateTime } from "luxon";
import { mkdir,writeFile } from "node:fs/promises";
assertSyntheticVerification();
const origin="http://localhost:3000";
const server=spawn(process.execPath,["node_modules/next/dist/bin/next","dev","--hostname","127.0.0.1","--port","3000"],{env:{...process.env,RESERVE_DEV_PREVIEW:"true",APP_ORIGIN:origin,RESERVE_BOOKING_EMAIL_ENABLED:"false",RESERVE_BOOKING_CRON_ENABLED:"false"},stdio:["ignore","pipe","pipe"]});
let logs="",browser;
server.stdout.on("data",d=>{logs+=d;});server.stderr.on("data",d=>{logs+=d;});
await mkdir("artifacts/booking-operations",{recursive:true});
try{
 await new Promise((resolve,reject)=>{server.stdout.on("data",d=>{if(String(d).includes("Ready in"))resolve();});server.on("exit",c=>reject(Error("Server exit "+c)));setTimeout(()=>reject(Error("Startup timeout")),45000).unref();});
 browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:["--no-sandbox","--disable-dev-shm-usage"]});
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();const errors=[];page.on("pageerror",e=>errors.push(e.message));
 async function api(path,method="GET",body){return page.evaluate(async({path,method,body})=>{const r=await fetch(path,{method,headers:body?{"Content-Type":"application/json"}:{},...(body?{body:JSON.stringify(body)}:{})});return{status:r.status,data:await r.json()};},{path,method,body});}
 await page.goto(origin+"/fix-it-shop/app/signin");
 const signed=await api("/api/auth","POST",{action:"preview",identity:"preview-katie"});
 assert.equal(signed.status,200);
 // Synthetic calendar rows exercise only the UI/API lifecycle. No hosted data.
 const day=DateTime.now().setZone("America/Chicago"),start=day.minus({minutes:15}),end=day.plus({minutes:30});
 const visit={id:"11111111-1111-4111-8111-111111111111",client_id:"preview-client",crm_client_id:null,client_name:"Synthetic Arrival",service_name:"Signature grooming",starts_at:start.toUTC().toISO(),ends_at:end.toUTC().toISO(),status:"confirmed",revision:1,arrived_at:null,clientHref:null};
 const data={provider:{id:"katie",name:"Katie",enabled:true},locations:[{id:"eunice",name:"Fix It Shop",timezone:"America/Chicago",enabled:true,booking_enabled:true}],location:{id:"eunice",name:"Fix It Shop",timezone:"America/Chicago",enabled:true,booking_enabled:true},date:day.toISODate(),visits:[visit],hasMore:false,counts:{confirmed:1,completed:0,cancelled:0,arrived:0,no_show:0},services:[],service:null,slots:[],slotState:"unconfigured"};
 await page.route("**/api/studio/day?**",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify(data)}));
 const mutations=[];
 await page.route("**/api/appointments/11111111-1111-4111-8111-111111111111",async r=>{const body=r.request().postDataJSON();mutations.push(body);assert.equal(body.revision,visit.revision);visit.revision++;if(body.action==="arrive"){visit.arrived_at=new Date().toISOString();data.counts.arrived=1;}if(body.action==="undo_arrival"){visit.arrived_at=null;data.counts.arrived=0;}if(body.action==="no_show"){visit.status="no_show";data.counts.no_show=1;data.counts.confirmed=0;}if(body.action==="undo_no_show"){visit.status="confirmed";data.counts.no_show=0;data.counts.confirmed=1;}await r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({appointment:visit})});});
 await page.goto(origin+"/studio");await page.getByRole("button",{name:"Mark arrived",exact:true}).waitFor();
 await page.getByRole("button",{name:"Mark arrived",exact:true}).focus();await page.keyboard.press("Enter");await page.getByRole("button",{name:"Undo arrival",exact:true}).waitFor();
 await page.getByRole("button",{name:"Undo arrival",exact:true}).click();await page.getByRole("button",{name:"Mark arrived",exact:true}).waitFor();
 visit.starts_at=day.minus({minutes:60}).toUTC().toISO();visit.ends_at=day.minus({minutes:15}).toUTC().toISO();await page.getByRole("button",{name:"Refresh",exact:true}).click();
 await page.getByRole("button",{name:"Mark no-show",exact:true}).waitFor();page.on("dialog",d=>d.accept());
 await page.getByRole("button",{name:"Mark no-show",exact:true}).click();await page.getByRole("button",{name:"Undo no-show",exact:true}).waitFor();
 await page.getByRole("button",{name:"Undo no-show",exact:true}).click();await page.getByRole("button",{name:"Mark no-show",exact:true}).waitFor();
 for(const width of[320,390,768,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Overflow at ${width}`);if(process.env.AXE_CORE_PATH){await page.addScriptTag({path:process.env.AXE_CORE_PATH});const audit=await page.evaluate(async()=>window.axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21a","wcag21aa"]}}));await writeFile(`artifacts/booking-operations/axe-${width}.json`,JSON.stringify(audit));assert.deepEqual(audit.violations.map(v=>v.id),[],`Accessibility violations at ${width}`);}await page.screenshot({path:`artifacts/booking-operations/studio-${width}.png`,fullPage:true});}
 assert.deepEqual(mutations.map(x=>x.action),["arrive","undo_arrival","no_show","undo_no_show"]);
 assert.equal((await api("/api/internal/booking-messages")).status,503);
 assert.equal((await api("/api/webhooks/resend","POST",{type:"email.delivered"})).status,503);
 assert.deepEqual(errors,[]);
 console.log("PASS synthetic Studio attendance controls at 320/390/768/1440, revision payloads, corrections, disabled notification routes and no page errors. API mutations were mocked; domain tests prove persistence and authorization.");
}finally{await browser?.close();server.kill("SIGTERM");await writeFile("artifacts/booking-operations/server.log",logs);}
