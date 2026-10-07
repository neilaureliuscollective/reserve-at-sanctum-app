import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { schema, seed, wrapPglite, type Database } from '../lib/db';
import type { Actor } from '../lib/booking';
import { readVisitContinuity, readSavedDirection, visitStage, rebookPath } from '../lib/experience/visits';
import { readGroomingHandoff } from '../lib/grooming-validation';
import { buildGroomingBlueprint } from '../lib/grooming';
const client: Actor = {id:'preview-client',name:'Jordan',email:'jordan@preview.invalid',role:'client',provider_id:null};
const other: Actor = {...client,id:'preview-other'};
const now = new Date('2026-10-04T15:00:00Z');
let pg: PGlite, db: Database;
before(async()=>{
  pg = new PGlite();await pg.waitReady;db=wrapPglite(pg);await schema(db);await seed(db);
  for(const [id,owner,start,status] of [
    ['past',client.id,'2026-10-03T15:00:00Z','confirmed'],
    ['completed',client.id,'2026-10-03T17:00:00Z','completed'],
    ['in-progress',client.id,'2026-10-04T14:45:00Z','confirmed'],
    ['future',client.id,'2026-10-06T15:00:00Z','confirmed'],
    ['cancelled',client.id,'2026-10-07T15:00:00Z','cancelled'],
    ['foreign',other.id,'2026-10-04T15:15:00Z','confirmed'],
  ]) await db.query(`INSERT INTO reserve_appointments(id,client_id,provider_id,service_id,starts_at,ends_at,busy_until,price,request_key,original_start,status,location_id,note) VALUES($1,$2,'katie','signature',$3,$3::timestamptz+interval '45 minutes',$3::timestamptz+interval '1 hour',4500,$1,$3,$4,'eunice','PRIVATE NOTE MUST NOT LEAK')`,[id,owner,start,status]);
});
after(async()=>{await pg.close();});
test('continuity uses nearest upcoming and latest elapsed owned records without notes',async()=>{
  const result=await readVisitContinuity(db,client,undefined,now);
  assert.equal(result.next?.id,'in-progress');assert.equal(result.previous?.id,'completed');
  assert.equal('note' in result.next!,false);assert.equal('client_id' in result.next!,false);
  assert.equal(visitStage(result.next!,now),'during');assert.equal(visitStage(result.previous!,now),'completed');
});
test('explicit visit IDs stay account scoped and non-client roles cannot read client continuity',async()=>{
  assert.equal((await readVisitContinuity(db,client,'foreign',now)).selected,null);
  assert.equal((await readVisitContinuity(db,other,'future',now)).selected,null);
  assert.equal((await readVisitContinuity(db,client,'future',now)).selected?.id,'future');
  await assert.rejects(readVisitContinuity(db,{...client,role:'staff',provider_id:'katie'},'future',now),/client account/);
});
test('elapsed is distinct from completion; cancellation wins over future time',async()=>{
  const elapsed=(await readVisitContinuity(db,client,'past',now)).selected!;
  assert.equal(visitStage(elapsed,now),'elapsed');
  assert.equal(visitStage((await readVisitContinuity(db,client,'future',now)).selected!,now),'before');
  assert.equal(visitStage((await readVisitContinuity(db,client,'cancelled',now)).selected!,now),'cancelled');
});
test('rebooking preselects only a currently enabled provider and service',async()=>{
  const active=(await readVisitContinuity(db,client,'future',now)).selected!;
  assert.equal(rebookPath(active),'/book?service=signature&location=eunice');
  await db.query("UPDATE reserve_services SET enabled=false WHERE id='signature'");
  const disabled=(await readVisitContinuity(db,client,'future',now)).selected!;
  assert.equal(rebookPath(disabled),'/book');
  await db.query("UPDATE reserve_services SET enabled=true WHERE id='signature'");
  await db.query("UPDATE reserve_providers SET enabled=false WHERE id='katie'");
  assert.equal(rebookPath((await readVisitContinuity(db,client,'future',now)).selected!),'/book');
  await db.query("UPDATE reserve_providers SET enabled=true WHERE id='katie'");
  await db.query("INSERT INTO reserve_providers(id,name,enabled) VALUES('other-provider','Other provider',true)");
  await db.query("UPDATE reserve_services SET provider_id='other-provider' WHERE id='signature'");
  assert.equal(rebookPath((await readVisitContinuity(db,client,'future',now)).selected!),'/book');
  await db.query("UPDATE reserve_services SET provider_id='katie' WHERE id='signature'");
});
test('saved direction is account-owned and excludes scan and personal Chair context',async()=>{
  await db.query(`INSERT INTO reserve_grooming_profiles(user_id,focus,maintenance,skin,hair,beard,blueprint) VALUES($1,'["A simpler daily ritual"]','Five minutes or less','No major concern','Wavy','Full beard',$2::jsonb)`,[client.id,JSON.stringify({direction:'YOUR OWN DIRECTION',ritual:['Keep it simple']})]);
  assert.equal((await readSavedDirection(db,client))?.blueprint.direction,'YOUR OWN DIRECTION');
  assert.equal(await readSavedDirection(db,other),null);
  assert.deepEqual(Object.keys((await readSavedDirection(db,client))!).sort(),['blueprint','updated_at']);
});
test('Blueprint sign-in drafts validate owner, expiry and shape; raw legacy drafts are not silently saved',()=>{
  const draft=buildGroomingBlueprint({focus:['A simpler daily ritual'],maintenance:'Five minutes or less',skin:'No major concern',hair:'Wavy',beard:'Full beard'});
  const envelope={version:1,owner:client.id,expires:now.getTime()+1000,value:draft};
  assert.deepEqual(readGroomingHandoff(JSON.stringify(envelope),client.id,now.getTime()),draft);
  assert.equal(readGroomingHandoff(JSON.stringify(envelope),other.id,now.getTime()),null);
  assert.equal(readGroomingHandoff(JSON.stringify(envelope),client.id,now.getTime()+2000),null);
  assert.equal(readGroomingHandoff(JSON.stringify(draft),client.id,now.getTime()),null);
  assert.equal(readGroomingHandoff('{broken',client.id,now.getTime()),null);
});
