import {before,after,test} from "node:test";
import assert from "node:assert/strict";
import {PGlite} from "@electric-sql/pglite";
import {schema,seed,wrapPglite,type Database} from "../lib/db";
import type {Actor} from "../lib/booking";
import {businessAppointments,revokeBusinessMembership,requireBusinessAccess} from "../lib/business-authority";
import {prepareBusiness,openSupportCase,supportOverview} from "../lib/business-management";
import {associateObservedSquarePayment} from "../lib/business-payments";
let pg:PGlite,db:Database;
const founder:Actor={id:"preview-neil",name:"Founder",email:"f@preview.invalid",role:"owner",provider_id:null};
const katie:Actor={...founder,id:"preview-katie",role:"operator",provider_id:"katie"};
const other:Actor={...founder,id:"preview-other",role:"staff",provider_id:"other"};
const env={RESERVE_BUSINESS_AUTHORITY_ENABLED:"true",RESERVE_PAYMENT_ASSOCIATION_ENABLED:"true"};
let business:string,second:string;
before(async()=>{
 pg=new PGlite();await pg.waitReady;db=wrapPglite(pg);await schema(db);await seed(db);
 business=(await prepareBusiness(db,founder,{displayName:"Synthetic business A",slug:"synthetic-a"})).id;
 second=(await prepareBusiness(db,founder,{displayName:"Synthetic business B",slug:"synthetic-b"})).id;
 await db.query("INSERT INTO reserve_providers(id,name,enabled) VALUES('other','Synthetic professional B',false)");
 for(const [b,p,u,role] of [[business,"katie",katie.id,"business_owner"],[second,"other",other.id,"business_owner"]]){
  await db.query("INSERT INTO reserve_business_providers(business_id,provider_id) VALUES($1,$2)",[b,p]);
  await db.query("INSERT INTO reserve_business_memberships(business_id,user_id,role,verified_at,verified_by) VALUES($1,$2,$3,now(),$4)",[b,u,role,founder.id]);
 }
 await db.query("INSERT INTO reserve_appointments(id,client_id,provider_id,service_id,starts_at,ends_at,busy_until,price,status,note,request_key,original_start) VALUES('visit-a','preview-client','katie','signature','2026-01-01T16:00Z','2026-01-01T16:45Z','2026-01-01T17:00Z',4500,'completed','private appointment canary','fixture-a','2026-01-01T16:00Z')");
});
after(async()=>pg.close());
test("closed drafts do not seed memberships, publish availability or confer global authority",async()=>{
 const [row]=await db.query("SELECT * FROM reserve_businesses WHERE id=$1",[business]);assert.equal(row.booking_status,"closed");assert.equal(row.subscription_status,"unconfigured");
 await assert.rejects(prepareBusiness(db,katie,{displayName:"forged",slug:"forged-business"}),/platform administration/);
 await assert.rejects(requireBusinessAccess(db,katie,business,"appointments.read",{}),/not been commissioned/);
});
test("tenant reads deny global owner, forged scopes and other-business users; customer notes never escape",async()=>{
 const rows=await businessAppointments(db,katie,business,env);assert.equal(rows.length,1);assert.equal(rows[0].id,"visit-a");assert.doesNotMatch(JSON.stringify(rows),/private appointment|preview-client/);
 for(const actor of [founder,other,{...other,provider_id:"katie",capability_overrides:[{capability:"appointments.read",decision:"allow" as const,scope:"company" as const}]}])await assert.rejects(businessAppointments(db,actor,business,env),/not authorized/);
 assert.equal((await businessAppointments(db,other,second,env)).length,0);
});
test("provider assignment cannot move silently between independent businesses",async()=>{
 await assert.rejects(db.query("INSERT INTO reserve_business_providers(business_id,provider_id) VALUES($1,'katie')",[second]),/unique|duplicate/);
 await assert.rejects(db.query("INSERT INTO reserve_business_staff_assignments(business_id,user_id,provider_id) VALUES($1,$2,'katie')",[second,other.id]),/foreign key/);
});
test("revocation removes access immediately and stale revisions and last-owner removal are rejected",async()=>{
 await db.query("INSERT INTO reserve_business_memberships(business_id,user_id,role,verified_at,verified_by) VALUES($1,$2,'staff',now(),$3)",[business,other.id,founder.id]);
 assert.equal((await businessAppointments(db,other,business,env)).length,0);
 await db.query("INSERT INTO reserve_business_staff_assignments(business_id,user_id,provider_id) VALUES($1,$2,'katie')",[business,other.id]);
 assert.equal((await businessAppointments(db,other,business,env)).length,1);
 await revokeBusinessMembership(db,katie,business,other.id,1,env);
 await assert.rejects(businessAppointments(db,other,business,env),/not authorized/);
 await assert.rejects(revokeBusinessMembership(db,katie,business,other.id,1,env),/Refresh/);
 await assert.rejects(revokeBusinessMembership(db,katie,business,katie.id,1,env),/last verified/);
});
test("technical support contains only business and categorical incident evidence",async()=>{
 await openSupportCase(db,founder,{businessId:business,category:"configuration",severity:"routine"});
 const data=await supportOverview(db,founder);assert.equal(data.cases.length,1);assert.doesNotMatch(JSON.stringify(data),/private appointment|preview-client|preview.invalid/);
 await assert.rejects(openSupportCase(db,katie,{businessId:business,category:"booking",severity:"urgent"}),/platform administration/);
});
test("Square association is disabled by default, seller-scoped, deduplicated and separate from Stripe entitlements",async()=>{
 const observation={environment:"sandbox",sellerId:"synthetic-seller",paymentId:"synthetic-payment",locationId:"synthetic-location",state:"COMPLETED",amountCents:4500,currency:"USD",observedAt:"2026-10-13T09:00:00Z"};
 await assert.rejects(associateObservedSquarePayment(db,katie,business,"visit-a",observation,{}),/not commissioned/);
 await assert.rejects(associateObservedSquarePayment(db,katie,business,"visit-a",observation,env),/seller and location/);
 await db.query("INSERT INTO reserve_business_square_locations(business_id,seller_id,square_location_id,environment) VALUES($1,$2,$3,'sandbox')",[business,observation.sellerId,observation.locationId]);
 const a=await associateObservedSquarePayment(db,katie,business,"visit-a",observation,env),b=await associateObservedSquarePayment(db,katie,business,"visit-a",observation,env);assert.equal(a.id,b.id);
 await assert.rejects(associateObservedSquarePayment(db,other,second,"visit-a",observation,env),/not authorized/);
 assert.equal((await db.query("SELECT * FROM reserve_appointment_payment_links")).length,1);
 assert.equal((await db.query("SELECT * FROM reserve_business_subscription_entitlements")).length,0);
 const [visit]=await db.query("SELECT price,status FROM reserve_appointments WHERE id='visit-a'");assert.equal(visit.price,4500);assert.equal(visit.status,"completed");
});
