import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { schema, seed, wrapPglite, type Database, type Queryable } from "../lib/db";
import { founderOverview } from "../lib/founder-overview";
import type { Actor } from "../lib/booking";
let pg:PGlite, db:Database;
const founder:Actor={id:"preview-neil",name:"Founder",email:"founder@preview.invalid",role:"owner",provider_id:null};
before(async()=>{pg=new PGlite();await pg.waitReady;db=wrapPglite(pg);await schema(db);await seed(db);});
after(async()=>pg.close());
test("overview reports persisted aggregates and does not invent businesses or revenue",async()=>{
 const data=await founderOverview(db,founder);
 assert.equal(data.professionals.available&&data.professionals.data.total,1);
 assert.equal(data.businesses.available&&data.businesses.data.total,0);
 assert.equal(data.bookings.available&&data.bookings.data.total,0);
 assert.equal(data.subscriptionRevenue,null);
 assert.doesNotMatch(JSON.stringify(data),/preview-client|preview.invalid/);
});
test("overview denies operator access before queries and isolates baseline schema failures",async()=>{
 let queries=0;
 const denied:Queryable={query:async()=>{queries++;throw Error("private");}};
 await assert.rejects(founderOverview(denied,{...founder,role:"operator",provider_id:"katie"}),/platform administration/);
 assert.equal(queries,0);
 const baseline:Queryable={query:async(sql,params)=>{if(sql.includes("FROM reserve_businesses"))throw Error("missing table secret");return db.query(sql,params);}};
 const data=await founderOverview(baseline,founder);
 assert.equal(data.businesses.available,false);assert.equal(data.professionals.available,true);
 assert.doesNotMatch(JSON.stringify(data),/secret/);
});
