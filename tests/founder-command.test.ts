import { test,before,after } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { schema,seed,wrapPglite,type Database,type Queryable } from "../lib/db";
import type { Actor } from "../lib/booking";
import { founderCommand,communicationConfiguration,providerReadiness } from "../lib/founder-command";
import { operatorIdentity } from "../lib/booking-operator-identity";
import { bookingEmailKinds,renderBookingEmail } from "../lib/booking-email-template";
import { listChairs,saveChair,saveChairNote } from "../lib/chair-store";
import { hasCapability } from "../lib/studio-permissions";
import { emptyChair } from "../lib/chair";
const founder: Actor={ id: "preview-neil",name: "Founder",email: "founder@preview.invalid",role: "owner",provider_id: null };
const katie: Actor={ ...founder,id: "preview-katie",role: "operator",provider_id: "katie" };
const client: Actor={ ...founder,id: "preview-client",role: "client" };
let pg: PGlite,db: Database;
before(async () => { pg=new PGlite(); await pg.waitReady; db=wrapPglite(pg); await schema(db); await seed(db); });
after(async () => { await pg.close(); });
test("only platform founder can query Founder Command, independent of provider or editable overrides",async () => {
  let queries=0;
  const denied: Queryable={ query: async () => { queries++; throw Error("Must not query"); } };
  for(const actor of [client,katie,{ ...katie,role: "staff" as const },{ ...katie,capability_overrides: [{ capability: "users.admin",decision: "allow" as const,scope: "company" as const }] }])
    await assert.rejects(founderCommand(denied,actor,{}),(e: unknown) => !!e&&typeof e==="object"&&"status" in e&&e.status===403);
  assert.equal(queries,0);
});
test("founder sees persisted configuration and zero actual messages; preview identity never counts as verified ownership",async () => {
  const data=await founderCommand(db,founder,{});
  assert.ok(data.directory.available);
  assert.equal(data.directory.data.providers.length,1);
  assert.equal(data.directory.data.providers[0].services,3);
  assert.equal(data.directory.data.providers[0].verified_staff,null);
  assert.equal(data.directory.data.providers[0].readiness.ownership,"Not verified");
  assert.equal(data.directory.data.publicMultiBusinessActivation,"disabled");
  assert.ok(data.communications.available);
  assert.equal(data.communications.data.queue.accepted,0);
  assert.deepEqual(data.communications.data.recent,[]);
  assert.equal(data.configuration.sendConfiguration,"disabled");
});
test("schema/API failures are unavailable rather than invented zeros; independent sections recover",async () => {
  const broken: Queryable={
    query: async (sql,params) => {
      if(sql.includes("reserve_booking_messages"))
        throw Error("private connection string"); return db.query(sql,params);
    }
  };
  const data=await founderCommand(broken,founder,{});
  assert.equal(data.communications.available,false);
  assert.equal(data.communications.data,null);
  assert.equal(data.directory.available,true);
  assert.equal(data.approvals.available,true);
  assert.doesNotMatch(JSON.stringify(data),/private connection/);
  assert.equal((await founderCommand(db,founder,{})).communications.available,true);
});
test("readiness requires evidence and cannot claim pilot verification or activation from valid catalog alone",() => {
  const p={ id: "p",name: "Professional",enabled: true,revision: 1,services: 1,locations: 1,addressed_locations: 1,staff: 1,verified_staff: 1,hours_valid: true,brand_published: true };
  assert.equal(providerReadiness(p).status,"Needs review");
  assert.equal(providerReadiness(p).pilot,"Unverified");
  assert.equal(providerReadiness({ ...p,services: 0,locations: 0,staff: 0 }).status,"Not configured");
  assert.equal(providerReadiness({ ...p,verified_staff: 0 }).status,"Blocked");
});
test("configuration exposes no secrets or sender values and keeps send/scheduler evidence separate",() => {
  const env={ RESEND_API_KEY: "secret-key",RESERVE_BOOKING_EMAIL_FROM: "private@example.com",RESEND_WEBHOOK_SECRET: "secret-webhook",CRON_SECRET: "secret-cron",RESERVE_BOOKING_CRON_ENABLED: "true" };
  const data=communicationConfiguration(env);
  assert.equal(data.schedulerEnabled,true);
  assert.equal(data.sendConfiguration,"disabled");
  assert.equal(data.domainVerification,"unavailable");
  assert.doesNotMatch(JSON.stringify(data),/secret-|private@example/);
  assert.equal(communicationConfiguration({ ...env,RESERVE_BOOKING_EMAIL_ENABLED: "true" }).sendConfiguration,"invalid");
});
test("transactional preview covers all templates, guest contact, DST and no private information",() => {
  const sample={ starts_at: "2027-07-06T15:00:00Z",ends_at: "2027-07-06T15:45:00Z",timezone: "America/Chicago",price: 4500,provider_name: "Synthetic",service_name: "Synthetic service",address: "Synthetic location",accountLinked: true };
  for(const kind of bookingEmailKinds) {
    const m=renderBookingEmail({ ...sample,kind },"https://booking.example.com");
    assert.match(m.text,/CDT/);
    assert.match(m.text,/45 minutes · \$45.00/);
    assert.match(m.text,/appointments/);
  }
  assert.match(renderBookingEmail({ ...sample,kind: "booked",starts_at: "2027-01-05T16:00:00Z",ends_at: "2027-01-05T16:45:00Z" },"https://booking.example.com").text,/CST/);
  assert.doesNotMatch(renderBookingEmail({ ...sample,kind: "booked",accountLinked: false },"https://booking.example.com").text,/appointments:/);
  assert.throws(() => renderBookingEmail({ ...sample,kind: "other" },"https://booking.example.com"),/Unsupported/);
});
test("platform founder has no Chair access, even with Katie provider ID or forged company override; Katie remains scoped",async () => {
  await saveChair(db,client,{ ...emptyChair,share_with_katie: true,detail: "Private Chair canary" });
  for(const actor of [founder,{ ...founder,provider_id: "katie" },{ ...founder,capability_overrides: [{ capability: "chair.read",decision: "allow" as const,scope: "company" as const }] },{ ...katie,provider_id: "other" }]) {
    await assert.rejects(listChairs(db,actor),/studio access/);
    await assert.rejects(saveChairNote(db,actor,{ user_id: client.id,body: "forged",revision: 0 }),/studio access/);
  }
  assert.equal(hasCapability(founder,"chair.read"),false);
  assert.equal(hasCapability(founder,"chair.notes.write"),false);
  assert.equal((await listChairs(db,katie))[0].detail,"Private Chair canary");
  await saveChairNote(db,katie,{ user_id: client.id,body: "Consented service note",revision: 0 });
  const data=await founderCommand(db,founder,{});
  assert.doesNotMatch(JSON.stringify(data),/Private Chair|Consented service note|preview-client|preview.invalid/);
});
test("PR66 affiliation correction does not mislabel the founder or other providers as Fix It Shop",() => {
  assert.match(operatorIdentity(founder).affiliation,/PLATFORM/);
  assert.equal(operatorIdentity(katie).affiliation,"FIX IT SHOP · KATIE’S STUDIO");
  assert.equal(operatorIdentity({ ...katie,provider_id: "other" }).affiliation,"PROVIDER · OPERATIONS");
});

test("least-privilege Auth denial preserves the provider directory with unavailable confirmation evidence",async () => {
  const restricted: Queryable={
query: async (sql,params) => {
      if(sql.includes("JOIN auth.users")) throw Error("permission denied");
      return db.query(sql,params);
    }
};
  const data=await founderCommand(restricted,founder,{});
  assert.ok(data.directory.available);
  assert.equal(data.directory.data.providers[0].verified_staff,null);
  assert.equal(data.directory.data.providers[0].services,3);
});
