import test from "node:test";
import assert from "node:assert/strict";
import {PGlite} from "@electric-sql/pglite";
import {schema,seed,wrapPglite} from "../lib/db";
import {bookingReadiness} from "../lib/booking-readiness";
test("read-only commissioning identifies missing business/staff setup without exposing identities or asserting live acceptance",async()=>{
 const pg=new PGlite();await pg.waitReady;const db=wrapPglite(pg);
 try{
  await schema(db);const closed=await bookingReadiness(db);assert.equal(closed.configurationPrerequisitesMet,false);assert.equal(closed.configuration.enabled_services,0);assert.equal(closed.liveAcceptance,"unverified");assert.equal(closed.occupancyProtected,true);assert.deepEqual(closed.schema.missingColumns,[]);
  await seed(db);const preview=await bookingReadiness(db);assert.equal(preview.configuration.scoped_staff,0);assert.equal(preview.configurationPrerequisitesMet,false);
  assert.doesNotMatch(JSON.stringify(preview),/Jordan|preview-client|@preview/);
  await db.query("ALTER TABLE reserve_booking_messages DROP COLUMN provider_message_id");
  const missing=await bookingReadiness(db);assert.ok(missing.schema.missingColumns.includes("reserve_booking_messages.provider_message_id"));
 }finally{await pg.close();}
});
