import { before, after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { DateTime } from "luxon";
import { schema, seed, wrapPglite, type Database } from "../lib/db";
import { book, type Actor } from "../lib/booking";
import { deliverBookingMessages, type DeliveryConfig } from "../lib/booking-delivery";
import { recordReceipt, parseReceipt, verifyReceiptSignature, readReceiptBytes, reconcilePendingReceipts } from "../lib/booking-receipts";
import { bookingMessages, bookingDeliveryHistory, confirmManualMessage } from "../lib/booking-pilot";
import { GET as cron } from "../app/api/internal/booking-messages/route";
import { POST as webhook } from "../app/api/webhooks/resend/route";
const config: DeliveryConfig={key:"mock",from:"booking@example.com",origin:"https://booking.example.com",secret:"s".repeat(32),notBefore:"2020-01-01T00:00:00Z"};
const client: Actor={id:"preview-client",name:"Synthetic",email:"synthetic@example.com",role:"client",provider_id:null};
const staff: Actor={id:"preview-katie",name:"Katie",email:"katie@preview.invalid",role:"operator",provider_id:"katie"};
let pg:PGlite,db:Database;
before(async () => {pg=new PGlite();await pg.waitReady;db=wrapPglite(pg);await schema(db);await seed(db);});
after(async () => {await pg.close();});
beforeEach(async () => {await db.query("DELETE FROM reserve_booking_receipts");await db.query("DELETE FROM reserve_booking_messages");await db.query("DELETE FROM reserve_occupancy");await db.query("DELETE FROM reserve_audit");await db.query("DELETE FROM reserve_appointments");});
async function appointment() {
 let day=DateTime.now().setZone("America/Chicago").startOf("day").plus({days:3});while (![2,3,4,5,6].includes(day.weekday)) day=day.plus({days:1});
 return book(db,client,{serviceId:"signature",start:day.set({hour:10}).toUTC().toISO()!,requestKey:randomUUID(),note:"Never put private text into a receipt"});
}
const event=(providerId:string,status:"accepted"|"delayed"|"delivered"|"bounced"|"complained"|"failed"|"suppressed",id=randomUUID(),occurredAt=new Date().toISOString())=>({id,providerId,status,occurredAt});
test("Standard Webhooks interoperability fixture, raw body tampering, old/future timestamps and rotation signatures",() => {
 // Public SDK fixture secret, static HMAC independently computed with Python.
 const secret="whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw",raw=Buffer.from('{"test": 2432232314}');
 const headers=new Headers({"svix-id":"msg_p5jXN8AQM9LWM0D4loKWxJek","svix-timestamp":"1700000000","svix-signature":"v1,hw6D+jquXiPwVQiZTwb2ek9FSrOofldv7tv4JVMsFUY="});
 assert.equal(verifyReceiptSignature(raw,headers,secret,1700000000000),"msg_p5jXN8AQM9LWM0D4loKWxJek");
 assert.throws(()=>verifyReceiptSignature(Buffer.from('{"test":2432232314}'),headers,secret,1700000000000),/Invalid/);
 assert.throws(()=>verifyReceiptSignature(raw,headers,secret,1700000301000),/Invalid/);
 assert.throws(()=>verifyReceiptSignature(raw,headers,secret,1699999699000),/Invalid/);
 headers.set("svix-signature","v1,bad v2,unknown v1,hw6D+jquXiPwVQiZTwb2ek9FSrOofldv7tv4JVMsFUY=");
 assert.ok(verifyReceiptSignature(raw,headers,secret,1700000000000));
 headers.set("svix-timestamp","1700000000junk");assert.throws(()=>verifyReceiptSignature(raw,headers,secret,1700000000000),/Invalid/);
});
test("only operational receipt fields are retained; opens/clicks and prototype event names are ignored",() => {
 const raw=Buffer.from(JSON.stringify({type:"email.delivered",created_at:"2026-10-12T12:00:00Z",data:{email_id:"provider-id",to:["private@example.com"],subject:"Sensitive",bounce:{message:"PII"}}}));
 assert.deepEqual(parseReceipt(raw,"receipt-id"),{id:"receipt-id",providerId:"provider-id",status:"delivered",occurredAt:"2026-10-12T12:00:00Z"});
 assert.equal(parseReceipt(Buffer.from('{"type":"email.opened"}'),"id"),null);
 assert.equal(parseReceipt(Buffer.from('{"type":"toString"}'),"id"),null);
 assert.throws(()=>parseReceipt(Buffer.from("{bad"),"id"),/Invalid receipt/);
});
test("receipt before acceptance is durable and reconciles when provider reference commits",async () => {
 await appointment();const id=randomUUID();
 await recordReceipt(db,event(id,"delivered"));
 const result=await deliverBookingMessages(db,config,async () => id);assert.equal(result.accepted,1);
 const [message]=await db.query("SELECT * FROM reserve_booking_messages WHERE kind='booked'");
 assert.equal(message.provider_message_id,id);assert.equal(message.delivery_status,"delivered");assert.ok(message.accepted_at);
 assert.equal((await db.query("SELECT message_id FROM reserve_booking_receipts"))[0].message_id,message.id);
 assert.equal((await bookingDeliveryHistory(db,staff))[0].delivery_status,"delivered");
 await assert.rejects(bookingDeliveryHistory(db,client),/Studio access/);
 assert.equal((await bookingDeliveryHistory(db,{...staff,provider_id:"other"})).length,0);
});
test("duplicates and out-of-order receipt events never resend or downgrade delivery",async () => {
 await appointment();const id=randomUUID();await deliverBookingMessages(db,config,async () => id);
 const delivered=event(id,"delivered");assert.deepEqual(await recordReceipt(db,delivered),{duplicate:false});assert.deepEqual(await recordReceipt(db,delivered),{duplicate:true});
 await recordReceipt(db,event(id,"accepted"));await recordReceipt(db,event(id,"delayed"));
 assert.equal((await db.query("SELECT delivery_status FROM reserve_booking_messages WHERE kind='booked'"))[0].delivery_status,"delivered");
 let sends=0;await deliverBookingMessages(db,config,async () => {sends++;return id;});assert.equal(sends,0);
 await assert.rejects(recordReceipt(db,{...delivered,status:"bounced"}),/reused/);
 assert.equal((await db.query("SELECT * FROM reserve_booking_receipts")).length,3);
});
test("bounce/complaint alerts stay scoped and manual acknowledgement never requeues accepted mail",async () => {
 await appointment();const id=randomUUID();await deliverBookingMessages(db,config,async () => id);
 await recordReceipt(db,event(id,"bounced"));await recordReceipt(db,event(id,"complained"));await recordReceipt(db,event(id,"delivered"));
 const [message]=await bookingMessages(db,staff);assert.equal(message.delivery_status,"complained");
 await assert.rejects(confirmManualMessage(db,{...staff,provider_id:"other"},message.id as string),/unavailable/);
 await confirmManualMessage(db,staff,message.id as string);assert.equal((await bookingMessages(db,staff)).length,0);
 assert.equal((await db.query("SELECT state FROM reserve_booking_messages WHERE kind='booked'"))[0].state,"sent");
 // Reminder to an address that bounced/complained is held for manual contact.
 await db.query("UPDATE reserve_booking_messages SET available_at=now() WHERE kind='reminder'");
 let sends=0;const result=await deliverBookingMessages(db,config,async () => {sends++;return randomUUID();});assert.equal(sends,0);assert.equal(result.manual,1);
});
test("unlinked early receipt is reconciled in a later bounded worker pass",async () => {
 await appointment();const id=randomUUID();await deliverBookingMessages(db,config,async () => id);
 await db.query("INSERT INTO reserve_booking_receipts(id,provider_message_id,status,occurred_at) VALUES($1,$2,'delivered',now())",[randomUUID(),id]);
 await reconcilePendingReceipts(db);
 assert.equal((await db.query("SELECT delivery_status FROM reserve_booking_messages WHERE kind='booked'"))[0].delivery_status,"delivered");
 assert.equal((await db.query("SELECT * FROM reserve_booking_receipts WHERE message_id IS NULL")).length,0);
});
test("webhook stream limit applies without Content-Length and verification rejects before DB access",async () => {
 const request=new Request("https://booking.example.com",{method:"POST",body:"x".repeat(32769)});
 await assert.rejects(readReceiptBytes(request),/too large/);
 const previous=process.env.RESEND_WEBHOOK_SECRET;process.env.RESEND_WEBHOOK_SECRET="whsec_"+Buffer.alloc(32,1).toString("base64");
 try {
  const response=await webhook(new Request("https://booking.example.com/api/webhooks/resend",{method:"POST",body:'{"type":"email.delivered"}'}));assert.equal(response.status,401);
  const raw='{"type":"email.opened"}';const timestamp=Math.floor(Date.now()/1000).toString(),id="signed-ignored";
  const signature=createHmac("sha256",Buffer.alloc(32,1)).update(`${id}.${timestamp}.${raw}`).digest("base64");
  const ignored=await webhook(new Request("https://booking.example.com/api/webhooks/resend",{method:"POST",body:raw,headers:{"svix-id":id,"svix-timestamp":timestamp,"svix-signature":`v1,${signature}`}}));assert.equal(ignored.status,200);assert.deepEqual(await ignored.json(),{ignored:true});
 } finally {if(previous===undefined)delete process.env.RESEND_WEBHOOK_SECRET;else process.env.RESEND_WEBHOOK_SECRET=previous;}
});
test("cron is independently disabled and requires bearer authentication before database work",async () => {
 const values={RESERVE_BOOKING_CRON_ENABLED:"true",RESERVE_BOOKING_EMAIL_ENABLED:"true",RESEND_API_KEY:"mock",RESERVE_BOOKING_EMAIL_FROM:config.from,APP_ORIGIN:config.origin,CRON_SECRET:config.secret,RESERVE_BOOKING_EMAIL_NOT_BEFORE:config.notBefore};
 const prior=Object.fromEntries(Object.keys(values).map(k=>[k,process.env[k]]));
 try {
  Object.assign(process.env,values);assert.equal((await cron(new Request("https://booking.example.com"))).status,401);
  process.env.RESERVE_BOOKING_CRON_ENABLED="false";assert.equal((await cron(new Request("https://booking.example.com",{headers:{authorization:`Bearer ${config.secret}`}}))).status,503);
 } finally {for(const k of Object.keys(values)){if(prior[k]===undefined)delete process.env[k];else process.env[k]=prior[k];}}
});
