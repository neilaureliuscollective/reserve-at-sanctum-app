import { before, after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { DateTime } from "luxon";
import { schema, seed, wrapPglite, type Database } from "../lib/db";
import { book, change, visits, type Actor } from "../lib/booking";
import { providerDay } from "../lib/provider-day";
const client: Actor = {id:"preview-client",name:"Synthetic",email:"synthetic@example.invalid",role:"client",provider_id:null};
const staff: Actor = {id:"preview-katie",name:"Katie",email:"katie@preview.invalid",role:"operator",provider_id:"katie"};
let db: Database,pg:PGlite;
before(async () => { pg=new PGlite(); await pg.waitReady; db=wrapPglite(pg); await schema(db); await seed(db); });
after(async () => { await pg.close(); });
beforeEach(async () => { await db.query("DELETE FROM reserve_booking_messages"); await db.query("DELETE FROM reserve_occupancy"); await db.query("DELETE FROM reserve_audit"); await db.query("DELETE FROM reserve_appointments"); });
async function visit(past=false) {
 let day=DateTime.now().setZone("America/Chicago").startOf("day").plus({days:3});
 while (![2,3,4,5,6].includes(day.weekday)) day=day.plus({days:1});
 const a=await book(db,client,{serviceId:"signature",start:day.set({hour:10}).toUTC().toISO()!,requestKey:randomUUID(),note:""});
 // Advance the synthetic visit to today without changing system/production clocks.
 const start=DateTime.now().minus({minutes:past?60:15});
 await db.query("UPDATE reserve_appointments SET starts_at=$2,ends_at=$3,busy_until=$4 WHERE id=$1",[a.id,start.toISO(),start.plus({minutes:45}).toISO(),start.plus({minutes:60}).toISO()]);
 return a;
}
test("arrival is scoped, revision protected, audited and consistent in the day/calendar without changing price or occupancy",async () => {
 const a=await visit();
 await assert.rejects(change(db,client,a.id,{action:"arrive",revision:1}),/Studio access/);
 await assert.rejects(change(db,{...staff,provider_id:"other"},a.id,{action:"arrive",revision:1}),/not found/);
 const arrived=await change(db,staff,a.id,{action:"arrive",revision:1});
 assert.equal(arrived.revision,2); assert.ok(arrived.arrived_at); assert.equal(arrived.status,"confirmed"); assert.equal(arrived.price,4500);
 assert.equal((await db.query("SELECT * FROM reserve_occupancy WHERE appointment_id=$1",[a.id])).length,4);
 assert.ok((await visits(db,client)).find(v=>v.id===a.id)?.arrived_at);
 const day=await providerDay(db,staff); assert.equal(day.counts.arrived,1); assert.equal(day.visits[0].revision,2);
 await assert.rejects(change(db,staff,a.id,{action:"arrive",revision:1}),/Refresh/);
 await assert.rejects(change(db,staff,a.id,{action:"arrive",revision:2}),/once/);
 assert.equal((await db.query("SELECT * FROM reserve_audit WHERE action='arrive'")).length,1);
 assert.equal((await db.query("SELECT state FROM reserve_booking_messages WHERE kind='reminder'"))[0].state,"superseded");
 const confirmation=(await db.query("SELECT revision FROM reserve_booking_messages WHERE kind='booked'"))[0]; assert.equal(confirmation.revision,2);
 const corrected=await change(db,staff,a.id,{action:"undo_arrival",revision:2}); assert.equal(corrected.arrived_at,null); assert.equal(corrected.revision,3);
});
test("no-show is explicit after scheduled end, never inferred from time, and can be corrected without losing history",async () => {
 const a=await visit(true);
 assert.equal((await visits(db,staff,true))[0].status,"confirmed");
 const noShow=await change(db,staff,a.id,{action:"no_show",revision:1});
 assert.equal(noShow.status,"no_show"); assert.ok(noShow.no_show_at); assert.equal(noShow.price,4500);
 const day=await providerDay(db,staff); assert.equal(day.counts.no_show,1); assert.equal(day.counts.cancelled,0); assert.equal(day.counts.completed,0);
 assert.equal((await db.query("SELECT * FROM reserve_occupancy WHERE appointment_id=$1",[a.id])).length,4);
 await assert.rejects(change(db,client,a.id,{action:"undo_no_show",revision:2}),/Studio access/);
 await assert.rejects(change(db,staff,a.id,{action:"complete",revision:2}),/no longer active/);
 const restored=await change(db,staff,a.id,{action:"undo_no_show",revision:2}); assert.equal(restored.status,"confirmed"); assert.equal(restored.no_show_at,null);
 const complete=await change(db,staff,a.id,{action:"complete",revision:3}); assert.equal(complete.status,"completed");
 const actions=await db.query<{action:string}>("SELECT action FROM reserve_audit WHERE appointment_id=$1 ORDER BY id",[a.id]);
 assert.deepEqual(actions.map(x=>x.action),["booked","no_show","undo_no_show","completed"]);
});
test("premature no-shows, attended no-shows and arrival on a different local day fail",async () => {
 const a=await visit();
 await assert.rejects(change(db,staff,a.id,{action:"no_show",revision:1}),/scheduled end/);
 await change(db,staff,a.id,{action:"arrive",revision:1});
 await db.query("UPDATE reserve_appointments SET ends_at=now()-interval '1 minute' WHERE id=$1",[a.id]);
 await assert.rejects(change(db,staff,a.id,{action:"no_show",revision:2}),/not arrived/);
 await change(db,staff,a.id,{action:"undo_arrival",revision:2});
 await db.query("UPDATE reserve_appointments SET starts_at=now()+interval '2 days',ends_at=now()+interval '2 days 45 minutes',busy_until=now()+interval '2 days 60 minutes' WHERE id=$1",[a.id]);
 await assert.rejects(change(db,staff,a.id,{action:"arrive",revision:3}),/appointment day/);
});
test("simultaneous terminal staff actions have exactly one winner and one audit event",async () => {
 const a=await visit(true);
 const outcomes=await Promise.allSettled([change(db,staff,a.id,{action:"no_show",revision:1}),change(db,staff,a.id,{action:"complete",revision:1})]);
 assert.equal(outcomes.filter(x=>x.status==="fulfilled").length,1);
 assert.equal((await db.query("SELECT * FROM reserve_audit WHERE action IN ('no_show','completed')")).length,1);
});
