import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { DateTime } from "luxon";
import { schema, seed, wrapPglite, type Database } from "../lib/db";
import { book, change, availability, units, type Actor } from "../lib/booking";
import { recoverBooking, bookingNotification } from "../lib/booking-recovery";
import { bookingNotificationCopy } from "../lib/booking-confirmation";
import { operationInput } from "../lib/studio-operations";
import { bookingReadiness } from "../lib/booking-readiness";
import { katieNativeBooking } from "../lib/katie-launch";
import { fixItSearchMetadata } from "../lib/fix-it-search";
let pg:PGlite, db:Database;
const client:Actor={id:"preview-client",name:"Synthetic",email:"test@preview.invalid",role:"client",provider_id:null};
const other:Actor={...client,id:"preview-other"};
let day=DateTime.now().setZone("America/Chicago").startOf("day").plus({days:3});
function start(hour=10,minute=0) { do {day=day.plus({days:1});} while(![2,3,4,5,6].includes(day.weekday)); return day.set({hour,minute}).toUTC().toISO()!; }
const input=(time:string, serviceId="exact-20")=>({serviceId,start:time,note:"Synthetic note",requestKey:randomUUID()});
before(async()=>{
  pg=new PGlite();await pg.waitReady;db=wrapPglite(pg);await schema(db);await seed(db);
  for(const minutes of [20,25,70]) await db.query("INSERT INTO reserve_services(id,provider_id,name,description,minutes,buffer,price,enabled) VALUES($1,'katie',$1,'Synthetic only',$2,5,3000,true)",[`exact-${minutes}`,minutes]);
});
after(async()=>pg.close());
test("menu configuration accepts exact 20/25/70 minute durations and 5-minute buffers, rejecting invalid steps",()=>{
  const value={kind:"service",provider_id:"katie",target_revision:0,name:"Synthetic",description:"Test only",minutes:20,buffer:5,price:3000,enabled:false};
  for(const minutes of [20,25,70]) assert.equal(operationInput.parse({...value,minutes}).kind,"service");
  for(const minutes of [0,21,481]) assert.equal(operationInput.safeParse({...value,minutes}).success,false);
  assert.equal(units(DateTime.fromISO("2026-10-20T10:00:00Z"),25).length,2);
});
test("exact durations and buffers protect final partial units, adjacency, prices and reschedule snapshots",async()=>{
  for(const minutes of [20,25,70]) {
    const time=start(), intent=input(time,`exact-${minutes}`), saved=await book(db,client,intent);
    assert.equal((+new Date(saved.ends_at)-+new Date(saved.starts_at))/60000,minutes);
    assert.equal((+new Date(saved.busy_until)-+new Date(saved.ends_at))/60000,5);
    assert.equal(saved.price,3000);
    const last=DateTime.fromISO(time).plus({minutes:(Math.ceil((minutes+5)/15)-1)*15}).toUTC().toISO()!;
    await assert.rejects(book(db,other,input(last)),/just taken/);
    const adjacent=DateTime.fromISO(time).plus({minutes:Math.ceil((minutes+5)/15)*15}).toUTC().toISO()!;
    const choices=await availability(db,intent.serviceId,DateTime.fromISO(time).setZone("America/Chicago").toISODate()!);
    assert.ok(!choices.some(x=>x.start===last));assert.ok(choices.some(x=>x.start===adjacent));
    await book(db,other,input(adjacent));
    await db.query("UPDATE reserve_services SET minutes=30,buffer=15,price=9000 WHERE id=$1",[intent.serviceId]);
    const moved=await change(db,client,saved.id,{action:"reschedule",start:start(),revision:1});
    assert.equal((+new Date(moved.ends_at)-+new Date(moved.starts_at))/60000,minutes);
    assert.equal((+new Date(moved.busy_until)-+new Date(moved.ends_at))/60000,5);assert.equal(moved.price,3000);
    await db.query("UPDATE reserve_services SET minutes=$2,buffer=5,price=3000 WHERE id=$1",[intent.serviceId,minutes]);
  }
});
test("exact buffered ends fit closing; overrun fails; quarter-hour blocks conflict with partial units",async()=>{
  for (const minutes of [20,25,70]) {
    const time=start();
    await db.query("UPDATE reserve_services SET buffer=0 WHERE id=$1",[`exact-${minutes}`]);
    const saved=await book(db,client,input(time,`exact-${minutes}`));
    assert.equal((+new Date(saved.busy_until)-+new Date(saved.starts_at))/60000,minutes);
    assert.equal((await db.query("SELECT starts_at FROM reserve_occupancy WHERE appointment_id=$1",[saved.id])).length,Math.ceil(minutes/15));
    await db.query("UPDATE reserve_services SET buffer=5 WHERE id=$1",[`exact-${minutes}`]);
  }
  const time=start(16,30);
  await book(db,client,input(time,"exact-25")); // 25 + 5 = exactly 17:00
  await assert.rejects(book(db,other,input(start(16,45))),/outside studio/);
  const blocked=start();
  await db.query("INSERT INTO reserve_occupancy(provider_id,starts_at,block_reason) VALUES('katie',$1,'Synthetic block')",[DateTime.fromISO(blocked).plus({minutes:15}).toISO()]);
  await assert.rejects(book(db,client,input(blocked)),/just taken/);
});
test("competing and repeated requests cannot double-book partial final occupancy",async()=>{
  const time=start(),a=input(time,"exact-70"),b=input(DateTime.fromISO(time).plus({minutes:60}).toISO()!);
  const results=await Promise.allSettled([book(db,client,a),book(db,other,b)]);
  assert.equal(results.filter(x=>x.status==="fulfilled").length,1);
  const repeat=input(start());const saved=await book(db,client,repeat);
  const replies=await Promise.all([book(db,client,repeat),book(db,client,repeat)]);
  assert.ok(replies.every(x=>x.id===saved.id));
  await assert.rejects(book(db,client,{...repeat,note:"Changed intent"}),/already used/);
});
test("lost response recovery returns owned saved snapshot without notes and cannot expose another customer's booking",async()=>{
  const intent=input(start()),saved=await book(db,client,intent);
  const recovered=await recoverBooking(db,client,intent.requestKey);
  assert.equal(recovered.appointment?.id,saved.id);assert.equal(recovered.notification,"queued");
  assert.ok(!("note" in recovered.appointment!));assert.doesNotMatch(JSON.stringify(recovered),/Synthetic note|preview-client/);
  assert.equal((await recoverBooking(db,other,intent.requestKey)).appointment,null);
  assert.equal((await recoverBooking(db,client,intent.requestKey)).appointment?.id,saved.id);
});
test("recovery before delayed POST retires the old request; new intent uses a fresh key",async()=>{
  const intent=input(start());
  assert.equal((await recoverBooking(db,client,intent.requestKey)).appointment,null);
  assert.equal((await recoverBooking(db,client,intent.requestKey)).appointment,null);
  await assert.rejects(book(db,client,intent),/safely closed/);
  await assert.rejects(book(db,client,{...intent,note:"Changed"}),/safely closed/);
  const saved=await book(db,client,{...intent,requestKey:randomUUID(),note:"Changed"});assert.ok(saved.id);
});
test("competing recovery/submission settles once; both transaction orders are safe",async()=>{
  for(const order of ["book-first","recover-first"]){
    const intent=input(start());
    const results=await Promise.allSettled(order==="book-first"?[book(db,client,intent),recoverBooking(db,client,intent.requestKey)]:[recoverBooking(db,client,intent.requestKey),book(db,client,intent)]);
    const recovered=await recoverBooking(db,client,intent.requestKey);
    const rows=await db.query("SELECT id FROM reserve_appointments WHERE client_id=$1 AND request_key=$2",[client.id,intent.requestKey]);
    assert.equal(rows.length,recovered.appointment?1:0);
    if(!recovered.appointment) await assert.rejects(book(db,client,intent),/safely closed/);
    assert.ok(results.some(x=>x.status==="fulfilled"));
  }
});
test("notification copy distinguishes queued, accepted, delivery and unavailable without changing booking success",async()=>{
  const saved=await book(db,client,input(start()));
  for(const [state,receipt,expected] of [["manual_required",null,"queued"],["sent","accepted","accepted"],["sent","delivered","delivered"],["sent","bounced","attention"]] as const){
    await db.query("UPDATE reserve_booking_messages SET state=$2,delivery_status=$3 WHERE appointment_id=$1 AND kind='booked'",[saved.id,state,receipt]);
    assert.equal(await bookingNotification(db,saved.id),expected);
    assert.doesNotMatch(bookingNotificationCopy(expected),/no notification was sent/i);
  }
  assert.equal(await bookingNotification({query:async()=>{throw Error("offline");}},saved.id),"unavailable");
});
test("Katie diagnostics do not count other providers, addresses or merely UUID-shaped accounts",async()=>{
  await db.query("INSERT INTO reserve_providers(id,name,enabled) VALUES('other','Synthetic other',true)");
  const id=randomUUID();await db.query("INSERT INTO reserve_users(id,name,email,role,provider_id) VALUES($1,'Synthetic','other@preview.invalid','staff','other')",[id]);
  const data=await bookingReadiness(db,{providerId:"katie",locationId:"missing",accountId:id});
  assert.equal(data.configuration.scoped_staff,0);assert.equal(data.configuration.booking_locations,0);assert.equal(data.configuration.assigned_providers,0);assert.equal(data.accountConfirmed,null);assert.equal(data.configurationPrerequisitesMet,false);
  assert.doesNotMatch(JSON.stringify(data),new RegExp(id));
  assert.equal(data.schema.exactDurationsSupported,true);
});
test("calendar cutover fails closed; previews and private metadata cannot be indexed",()=>{
  assert.equal(katieNativeBooking({}),false);
  assert.equal(katieNativeBooking({NODE_ENV:"production",RESERVE_DEV_PREVIEW:"true"}),false);
  assert.equal(katieNativeBooking({NODE_ENV:"development",RESERVE_DEV_PREVIEW:"true",DATABASE_URL:"present"}),false);
  assert.equal(katieNativeBooking({RESERVE_KATIE_CALENDAR:"native"}),true);
  for(const VERCEL_ENV of ["preview","development",undefined]) assert.equal(fixItSearchMetadata("/fix-it-shop/app",{VERCEL_ENV,RESERVE_PUBLIC_CANONICAL_ORIGIN:"https://approved.example"}).alternates?.canonical,undefined);
  const metadata=fixItSearchMetadata("/fix-it-shop/app",{VERCEL_ENV:"production",RESERVE_PUBLIC_CANONICAL_ORIGIN:"https://approved.example"});
  assert.equal(metadata.alternates?.canonical,"https://approved.example/fix-it-shop/app");assert.deepEqual(metadata.robots,{index:false,follow:false});
});
test("isolated synthetic backup restores exact visits and retired request protection",async()=>{
  const key=randomUUID();await recoverBooking(db,client,key);
  const before=await db.query("SELECT id,starts_at,ends_at,busy_until,price,status FROM reserve_appointments ORDER BY id");
  const dump=await pg.dumpDataDir();
  const restored=new PGlite({loadDataDir:dump});await restored.waitReady;
  try {
    const copy=wrapPglite(restored);
    assert.deepEqual(await copy.query("SELECT id,starts_at,ends_at,busy_until,price,status FROM reserve_appointments ORDER BY id"),before);
    await assert.rejects(book(copy,client,{...input(start()),requestKey:key}),/safely closed/);
  }finally{await restored.close();}
});
