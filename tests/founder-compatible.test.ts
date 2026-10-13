import test from "node:test";
import assert from "node:assert/strict";
import {PGlite} from "@electric-sql/pglite";
import {schema,seed,wrapPglite,type Queryable} from "../lib/db";
import type {Actor} from "../lib/booking";
import {founderCommand} from "../lib/founder-command";
const founder:Actor={id:"preview-neil",name:"Founder",email:"f@preview.invalid",role:"owner",provider_id:null};
test("Founder survives unavailable receipt schema without exposing errors or losing independent configuration evidence",async()=>{
 const pg=new PGlite();await pg.waitReady;const db=wrapPglite(pg);
 try{
  await schema(db);await seed(db);
  const legacy:Queryable={query:async(sql,params)=>{
   if(sql.includes("reserve_booking_receipts")||sql.includes("m.delivery_status"))throw Error("absent production column secret");
   return db.query(sql,params);
  }};
  const data=await founderCommand(legacy,founder,{});
  assert.equal(data.communications.available,false);assert.equal(data.directory.available,true);assert.equal(data.approvals.available,true);
  assert.equal(data.configuration.sendConfiguration,"disabled");assert.doesNotMatch(JSON.stringify(data),/secret/);
 }finally{await pg.close();}
});
