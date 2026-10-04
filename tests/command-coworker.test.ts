import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { DateTime } from 'luxon';
import { schema, seed, wrapPglite, type Database } from '../lib/db';
import { type Actor, ZONE } from '../lib/booking';
import { commandCenter, createWorkspaceItem, updateWorkspaceItem, dayRange } from '../lib/command-center';
import { roomIndex, createRoom, roomHistory, claimTurn, produceTurn, readCoworkerTool, revokeMember, type Provider } from '../lib/reserve-coworker';
import { confirmFact, retireFact } from '../lib/business-knowledge';
const neil:Actor={id:'preview-neil',name:'Neil',email:'neil@preview.invalid',role:'owner',provider_id:null};
const katie:Actor={id:'preview-katie',name:'Katie',email:'katie@preview.invalid',role:'staff',provider_id:'katie'};
const client:Actor={id:'preview-client',name:'Jordan',email:'jordan@preview.invalid',role:'client',provider_id:null};
const other:Actor={id:'other-staff',name:'Other',email:'other@preview.invalid',role:'staff',provider_id:'other-provider'};
let pg:PGlite,db:Database;
const today=()=>DateTime.now().setZone(ZONE).toISODate()!;
before(async()=>{
  pg=new PGlite();await pg.waitReady;db=wrapPglite(pg);await schema(db);await seed(db);
  await db.query("INSERT INTO reserve_providers(id,name,enabled) VALUES('other-provider','Other provider',true)");
  await db.query("INSERT INTO reserve_users(id,name,email,role,provider_id) VALUES('other-staff','Other','other@preview.invalid','staff','other-provider')");
  await db.query("INSERT INTO reserve_services(id,provider_id,name,description,minutes,buffer,price,enabled) VALUES('other-service','other-provider','Other service','Approved service',30,15,3500,true)");
});
beforeEach(async()=>{
  await db.query('DELETE FROM reserve_ai_turns');await db.query('DELETE FROM reserve_ai_conversations');
  await db.query('DELETE FROM reserve_workspace_items');await db.query('DELETE FROM reserve_business_facts');
  await db.query('DELETE FROM reserve_occupancy');await db.query('DELETE FROM reserve_appointments');
  await db.query("UPDATE reserve_users SET role='staff',provider_id='katie' WHERE id='preview-katie'");
  await db.query("UPDATE reserve_users SET role='owner',provider_id=NULL WHERE id='preview-neil'");
  delete process.env.RESERVE_AI_DAILY_ATTEMPTS;delete process.env.RESERVE_AI_BUSINESS_DAILY_ATTEMPTS;
});
after(async()=>{await pg.close();});
const task={kind:'task' as const,lane:'reserve' as const,title:'Approve shelf labels',detail:'Business work',assignee:'both' as const};
async function appointment(provider='katie'){
  const id=randomUUID(),start=DateTime.now().setZone(ZONE).startOf('day').plus({hours:18}).toUTC().toISO();
  await db.query(`INSERT INTO reserve_appointments(id,client_id,provider_id,service_id,starts_at,ends_at,busy_until,price,note,request_key,original_start)
    VALUES($1,'preview-client',$2,$3,$4,$4::timestamptz+interval '30 minutes',$4::timestamptz+interval '45 minutes',3500,'PRIVATE_APPOINTMENT_NOTE',$1,$4)`,[id,provider,provider==='katie'?'refresh':'other-service',start]);return id;
}
test('clients, missing providers and forged roles cannot read operator data',async()=>{
  await assert.rejects(commandCenter(db,client),/access/);
  await assert.rejects(commandCenter(db,{...client,role:'owner'}),/access/);
  await db.query("UPDATE reserve_users SET provider_id=NULL WHERE id='other-staff'");
  await assert.rejects(commandCenter(db,other),/access/);
  await db.query("UPDATE reserve_users SET provider_id='other-provider' WHERE id='other-staff'");
});
test('provider data stays scoped even when browser-supplied actor fields are tampered',async()=>{
  const a=await appointment(),b=await appointment('other-provider');
  const owner=await commandCenter(db,neil),staff=await commandCenter(db,{...katie,provider_id:'other-provider',role:'owner'});
  assert.equal(owner.pulse.today,2);assert.equal(staff.pulse.today,1);
  assert.deepEqual(staff.day.map(a=>a.id),[a]);assert.ok(!JSON.stringify(staff).includes(b));
  assert.ok(!JSON.stringify(staff).includes('PRIVATE_APPOINTMENT_NOTE'));
});
test('day boundaries include DST days of 23 and 25 hours',()=>{
  const duration=(date:string)=>{const [start,end]=dayRange(date);return (+new Date(end)-+new Date(start))/3600000;};
  assert.equal(duration('2026-03-08'),23);assert.equal(duration('2026-11-01'),25);
  assert.throws(()=>dayRange('2026-02-30'),/valid/);
});
test('shared history is preserved; founder and provider work have independent visibility',async()=>{
  const shared=await createWorkspaceItem(db,neil,task),founder=await createWorkspaceItem(db,neil,{...task,title:'Founder decision',visibility:'founder'});
  const provider=await createWorkspaceItem(db,katie,{...task,title:'Katie operations',visibility:'provider'});
  assert.deepEqual(new Set((await commandCenter(db,katie)).items.map(w=>w.id)),new Set([shared.id,provider.id]));
  assert.deepEqual((await commandCenter(db,other)).items.map(w=>w.id),[shared.id]);
  await assert.rejects(updateWorkspaceItem(db,katie,founder.id,{revision:1,title:'Tampered'}),/not found/);
  await assert.rejects(createWorkspaceItem(db,katie,{...task,visibility:'founder'}),/Founder/);
});
test('aggregate work counts remain correct beyond the page limit',async()=>{
  for(let i=0;i<65;i++)await createWorkspaceItem(db,neil,{...task,title:'Task '+i});
  const first=await commandCenter(db,neil),second=await commandCenter(db,neil,undefined,50);
  assert.equal(first.items.length,50);assert.equal(first.pulse.openBuild,65);assert.equal(first.hasMore,true);
  assert.equal(second.items.length,15);assert.equal(second.hasMore,false);
});
test('concurrent edits have one winner and preserve revision audit',async()=>{
  const item=await createWorkspaceItem(db,neil,task);
  const results=await Promise.allSettled([updateWorkspaceItem(db,neil,item.id,{revision:1,title:'First'}),updateWorkspaceItem(db,katie,item.id,{revision:1,title:'Second'})]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal((await commandCenter(db,neil)).items[0].revision,2);
  assert.equal((await db.query("SELECT * FROM reserve_command_audit WHERE resource_id=$1 AND action='work-updated'",[item.id])).length,1);
});
test('handoffs require permitted recipients and acknowledgement belongs to the recipient',async()=>{
  const item=await createWorkspaceItem(db,neil,task);
  await assert.rejects(updateWorkspaceItem(db,neil,item.id,{revision:1,handoff_to:client.id}),/another/);
  const sent=await updateWorkspaceItem(db,neil,item.id,{revision:1,handoff_to:katie.id});
  await assert.rejects(updateWorkspaceItem(db,neil,item.id,{revision:2,acknowledge:true}),/not waiting/);
  const received=await updateWorkspaceItem(db,katie,sent.id,{revision:2,acknowledge:true});
  const done=await updateWorkspaceItem(db,katie,sent.id,{revision:received.revision,completed:true});
  assert.equal(done.handoff_state,'done');assert.ok(done.completed_at);
  assert.equal(done.status,'captured'); // completing work is independent of approving direction
});
test('private conversations cannot be listed or read by another operator, including the founder',async()=>{
  const room=await createRoom(db,katie,{title:'Katie private'});
  assert.equal((await roomIndex(db,neil)).rooms.length,0);
  await assert.rejects(roomHistory(db,neil,room.id),/not found/);
  await assert.rejects(roomHistory(db,other,room.id),/not found/);
  await assert.rejects(roomHistory(db,client,room.id),/access/);
});
test('shared Operations Rooms require explicit verified Katie membership and revocation takes effect',async()=>{
  await assert.rejects(createRoom(db,katie,{title:'Shared',shared:true,member_id:neil.id}),/founder/);
  await assert.rejects(createRoom(db,neil,{title:'Shared',shared:true,member_id:client.id}),/verified/);
  const room=await createRoom(db,neil,{title:'Operations',shared:true,member_id:katie.id});
  assert.equal((await roomHistory(db,katie,room.id)).members.length,2);
  await assert.rejects(roomHistory(db,other,room.id),/not found/);
  await revokeMember(db,neil,room.id,katie.id);
  await assert.rejects(roomHistory(db,katie,room.id),/not found/);
});
test('shared AI reads use the permission intersection, never the founder private scope',async()=>{
  await appointment();await appointment('other-provider');
  const shared=await createWorkspaceItem(db,neil,task);
  await createWorkspaceItem(db,neil,{...task,title:'FOUNDER_PRIVATE',visibility:'founder'});
  await createWorkspaceItem(db,katie,{...task,title:'PROVIDER_PRIVATE',visibility:'provider'});
  const room=await createRoom(db,neil,{title:'Shared',shared:true,member_id:katie.id});
  const schedule=await readCoworkerTool(db,neil,room,'read_schedule',{date:today(),days:1});
  const work=await readCoworkerTool(db,neil,room,'read_work',{});
  assert.equal((schedule.data as {visits:unknown[]}).visits.length,1);
  assert.equal((work.data as {items:{id:string}[]}).items[0].id,shared.id);
  assert.ok(!JSON.stringify(work).includes('PRIVATE'));assert.ok(!JSON.stringify(schedule).includes('Other provider'));
});
test('AI DTOs exclude client names and every private-note/context sentinel',async()=>{
  await appointment();
  await db.query("INSERT INTO reserve_chair_profiles(user_id,intent,conversation,goal,maintenance,length,beard,detail,share_with_katie) VALUES('preview-client','clean','quiet','clean','easy','short','trim','PRIVATE_CHAIR_DETAIL',true) ON CONFLICT(user_id) DO NOTHING");
  await db.query("INSERT INTO reserve_chair_context(user_id,life,load) VALUES('preview-client','PRIVATE_LIFE_CONTEXT','PRIVATE_LOAD') ON CONFLICT(user_id) DO NOTHING");
  await db.query("INSERT INTO reserve_chair_notes(user_id,provider_id,author_id,body) VALUES('preview-client','katie','preview-katie','PRIVATE_GROOMING_NOTE') ON CONFLICT(user_id) DO NOTHING");
  const room=await createRoom(db,katie,{title:'Private'});
  const reads=await Promise.all(['read_schedule','read_work','read_business_facts'].map(name=>readCoworkerTool(db,katie,room,name,name==='read_schedule'?{date:today(),days:1}:{})));
  const serialized=JSON.stringify(reads);for(const value of ['PRIVATE_APPOINTMENT_NOTE','PRIVATE_CHAIR_DETAIL','PRIVATE_LIFE_CONTEXT','PRIVATE_LOAD','PRIVATE_GROOMING_NOTE','Jordan','jordan@'])assert.ok(!serialized.includes(value),value);
  await assert.rejects(readCoworkerTool(db,katie,room,'read_schedule',{date:today(),days:1,provider_id:'other-provider'}));
  await assert.rejects(readCoworkerTool(db,katie,room,'read_private_notes',{}),/Unknown/);
});
test('confirmed knowledge needs owner authority and retired facts stop appearing in AI reads',async()=>{
  await assert.rejects(confirmFact(db,katie,{lane:'reserve',title:'Rule',body:'Body',source:'Decision'}),/Founder/);
  const fact=await confirmFact(db,neil,{lane:'reserve',title:'Policy',body:'CURRENT_POLICY',source:'Owner-approved policy'});
  const room=await createRoom(db,katie,{title:'Private'});
  assert.ok(JSON.stringify(await readCoworkerTool(db,katie,room,'read_business_facts',{})).includes('CURRENT_POLICY'));
  await retireFact(db,neil,fact.id,1);
  assert.ok(!JSON.stringify(await readCoworkerTool(db,katie,room,'read_business_facts',{})).includes('CURRENT_POLICY'));
});
test('duplicate submission is replayed, mismatched identities rejected, and only one turn can run',async()=>{
  const room=await createRoom(db,katie,{title:'Private'}),input={conversation_id:room.id,request_key:randomUUID(),prompt:'Brief me.'};
  const first=await claimTurn(db,katie,input),retry=await claimTurn(db,katie,input);
  assert.equal(first.claimed,true);assert.equal(retry.claimed,false);assert.equal(first.turn.id,retry.turn.id);
  await assert.rejects(claimTurn(db,katie,{...input,prompt:'Different'}),/different/);
  await assert.rejects(claimTurn(db,katie,{...input,request_key:randomUUID()}),/already in progress/);
});
test('model reads produce a durable sourced answer and cannot acquire write tools',async()=>{
  await appointment();const room=await createRoom(db,katie,{title:'Private'});
  const claim=await claimTurn(db,katie,{conversation_id:room.id,request_key:randomUUID(),prompt:'Give me an opening brief.'});
  let calls=0;
  const mock:Provider=async input=>{
    calls++;
    assert.ok(!JSON.stringify(input).includes('PRIVATE_APPOINTMENT_NOTE'));
    const tools=input.tools as {name:string}[];assert.ok(tools.every(t=>t.name.startsWith('read_')));
    return calls===1?{status:'completed',output:[{type:'function_call',name:'read_schedule',arguments:JSON.stringify({date:today(),days:1}),call_id:'read-1'}]}:{status:'completed',usage:{output_tokens:12},output:[{type:'message',content:[{type:'output_text',text:'One recorded visit. Review preparation in the native Chair.'}]}]};
  };
  const saved=await produceTurn(db,katie,claim.turn,room,mock);
  assert.equal(saved.status,'ready');assert.equal(saved.evidence[0].kind,'schedule');assert.equal(calls,2);
  assert.equal((await roomHistory(db,katie,room.id)).turns[0].answer,saved.answer);
  assert.equal((await claimTurn(db,katie,{conversation_id:room.id,request_key:(await db.query<{request_key:string}>('SELECT request_key FROM reserve_ai_turns WHERE id=$1',[saved.id]))[0].request_key,prompt:claim.turn.prompt})).claimed,false);
});
test('revoking membership during provider work prevents the answer being saved or disclosed',async()=>{
  const room=await createRoom(db,neil,{title:'Shared',shared:true,member_id:katie.id});
  const claim=await claimTurn(db,katie,{conversation_id:room.id,request_key:randomUUID(),prompt:'Brief me.'});
  const mock:Provider=async()=>{await revokeMember(db,neil,room.id,katie.id);return {status:'completed',output:[{type:'message',content:[{type:'output_text',text:'Do not disclose this answer.'}]}]};};
  await assert.rejects(produceTurn(db,katie,claim.turn,room,mock),/not found/);
  const [saved]=await db.query<{answer:string;status:string}>('SELECT answer,status FROM reserve_ai_turns WHERE id=$1',[claim.turn.id]);
  assert.equal(saved.answer,'');assert.equal(saved.status,'failed');
});
test('provider failure is durable and late interrupted replies cannot become ready',async()=>{
  const room=await createRoom(db,katie,{title:'Private'}),claim=await claimTurn(db,katie,{conversation_id:room.id,request_key:randomUUID(),prompt:'Brief me.'});
  await assert.rejects(produceTurn(db,katie,claim.turn,room,async()=>{throw Error('secret provider detail');}),/could not finish/);
  assert.equal((await roomHistory(db,katie,room.id)).turns[0].error_code,'provider_failed');
  const second=await claimTurn(db,katie,{conversation_id:room.id,request_key:randomUUID(),prompt:'Try again.'});
  await db.query("UPDATE reserve_ai_turns SET created_at=now()-interval '3 minutes' WHERE id=$1",[second.turn.id]);
  await roomHistory(db,katie,room.id);
  await assert.rejects(produceTurn(db,katie,second.turn,room,async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'Late answer.'}]}]})),/interrupted/);
});
