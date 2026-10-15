import { assertSyntheticVerification } from "./synthetic-verification.mjs";
import { chromium } from "@playwright/test";
import { spawn, execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
assertSyntheticVerification();
const origin="http://localhost:3000",out="artifacts/katie-calendar-gate";
await mkdir(out,{recursive:true});
// Enabled synthetic catalog and a linked CRM client prove the calendar gate,
// rather than absent configuration, is what prevents new native appointments.
const fixture=JSON.parse(execFileSync(process.execPath,["--import","tsx","--input-type=module","-e",`
 import {PGlite} from '@electric-sql/pglite';import {DateTime} from 'luxon';
 import {schema,seed,wrapPglite} from './lib/db.ts';import {book,availability} from './lib/booking.ts';
 import {randomUUID} from 'node:crypto';
 const pg=new PGlite('.data/reserve');await pg.waitReady;const db=wrapPglite(pg);await schema(db);await seed(db);
 const actor={id:'preview-client',name:'Synthetic',email:'test@preview.invalid',role:'client',provider_id:null};
 let day=DateTime.now().setZone('America/Chicago').plus({days:25}),slots=[];
 for(let i=0;i<12;i++,day=day.plus({days:1})){slots=await availability(db,'signature',day.toISODate());if(slots.length>1)break;}
 if(slots.length<2)throw Error('No isolated fixture availability');
 const appointment=await book(db,actor,{serviceId:'signature',locationId:'eunice',start:slots[0].start,note:'Synthetic existing calendar visit',requestKey:randomUUID()});
 const remaining=await availability(db,'signature',day.toISODate());if(!remaining.length)throw Error('No remaining fixture slot');
 const [client]=await db.query("SELECT id FROM reserve_clients WHERE user_id='preview-client' AND provider_id='katie'");
 console.log(JSON.stringify({appointment:appointment.id,clientId:client.id,date:day.toISODate(),start:remaining[0].start}));await pg.close();
`],{encoding:"utf8"}));
const server=spawn(process.execPath,["node_modules/next/dist/bin/next","dev","--hostname","127.0.0.1","--port","3000"],{env:{...process.env,RESERVE_DEV_PREVIEW:"true",RESERVE_KATIE_CALENDAR:"glossgenius",APP_ORIGIN:origin,RESERVE_BOOKING_EMAIL_ENABLED:"false",RESERVE_BOOKING_CRON_ENABLED:"false"},stdio:["ignore","pipe","pipe"]});
let logs="",browser;server.stdout.on("data",d=>logs+=d);server.stderr.on("data",d=>logs+=d);
try{
 await new Promise((resolve,reject)=>{server.stdout.on("data",d=>{if(String(d).includes("Ready in"))resolve();});server.on("exit",c=>reject(Error("Server exit "+c)));setTimeout(()=>reject(Error("Startup timeout")),45000).unref();});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||"/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage"]});
 const context=await browser.newContext();
 async function api(path,method="GET",data){return context.request.fetch(origin+path,{method,headers:{Origin:origin},...(data?{data}:{})});}
 async function login(identity){assert.equal((await api("/api/auth","POST",{action:"preview",identity})).status(),200);}
 await login("preview-client");
 const catalog=await (await api("/api/availability")).json();assert.equal(catalog.katieNativeCalendar,false);assert.ok(catalog.services.every(s=>s.provider_id!=="katie"));
 assert.equal((await api(`/api/availability?service=signature&date=${fixture.date}`)).status(),503);
 const request={serviceId:"signature",locationId:"eunice",start:fixture.start,requestKey:crypto.randomUUID(),actorId:"preview-client"};
 assert.equal((await api("/api/appointments","POST",request)).status(),503);
 assert.ok((await (await api("/api/appointments")).json()).visits.some(v=>v.id===fixture.appointment));
 await login("preview-katie");
 const setup=await (await api("/api/studio/pilot")).json();
 assert.ok(setup.services.some(s=>s.id==="signature"&&s.enabled),"Catalog really is enabled");
 const staffUrl=`/api/appointments?studio=true&date=${fixture.date}&provider=katie`;
 const before=(await (await api(staffUrl)).json()).visits;
 assert.ok(before.some(v=>v.id===fixture.appointment));
 assert.equal((await api(`/api/studio/pilot/appointments?provider=katie&service=signature&location=eunice&date=${fixture.date}`)).status(),503);
 const manual=await api("/api/studio/pilot/appointments","POST",{provider:"katie",clientId:fixture.clientId,serviceId:"signature",locationId:"eunice",start:fixture.start,requestKey:crypto.randomUUID()});
 assert.equal(manual.status(),503);assert.match((await manual.json()).error,/GlossGenius/);
 const after=(await (await api(staffUrl)).json()).visits;assert.deepEqual(after,before);
 const day=await (await api(`/api/studio/day?provider=katie&date=${fixture.date}&service=signature`)).json();
 assert.ok(day.visits.some(v=>v.id===fixture.appointment));assert.deepEqual(day.slots,[]);assert.equal(day.slotState,"closed");
 const existing=before.find(v=>v.id===fixture.appointment);
 assert.equal((await api(`/api/appointments/${fixture.appointment}`,"PATCH",{action:"cancel",revision:existing.revision})).status(),200,"Existing visit management survives gate");
 assert.equal((await api("/api/internal/booking-messages")).status(),503);
 const result={calendar:"glossgenius",fixture:"enabled synthetic catalog and linked CRM client",publicCreate:503,staffCreate:503,staffAvailability:503,calendarSlots:[],history:"preserved",existingCancellation:"passed",hosted:false};
 await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));console.log("PASS public/staff new booking and availability closed with enabled catalog; existing history and cancellation remain accessible.");
}finally{await browser?.close();server.kill("SIGTERM");await writeFile(`${out}/server.log`,logs);}
