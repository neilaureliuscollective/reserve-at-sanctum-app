import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { Client } from "pg";
import { DateTime } from "luxon";
import { schema, seed, type Database, type Queryable, type Row } from "../lib/db";
import { book, type Actor } from "../lib/booking";
import { manualAppointment } from "../lib/booking-pilot";
import { recoverBooking } from "../lib/booking-recovery";

async function main(){
// Intentionally no DATABASE_URL input, reset mode, or hosted target support.
// Run only against the disposable loopback container described in the packet.
const connection={host:"127.0.0.1",port:55439,user:"postgres",database:"katie_isolated"};
const databaseName="katie_verify_"+randomUUID().replaceAll("-","");
assert.equal(execFileSync("docker",["context","inspect","--format","{{.Endpoints.docker.Host}}"],{encoding:"utf8"}).trim(),"unix:///var/run/docker.sock","Only the local Docker daemon is supported");
const container=JSON.parse(execFileSync("docker",["inspect","katie-first-booking-postgres"],{encoding:"utf8"}))[0];
assert.equal(container.Config.Image,"postgres:17");
assert.deepEqual(container.NetworkSettings.Ports["5432/tcp"],[{HostIp:"127.0.0.1",HostPort:"55439"}]);
assert.equal(Object.hasOwn(container.HostConfig.Tmpfs,"/var/lib/postgresql/data"),true);
const admin=new Client(connection);await admin.connect();
const dbClients:Client[]=[];
const clientActor:Actor={id:"preview-client",name:"Synthetic client",email:"test@preview.invalid",role:"client",provider_id:null};
const staff:Actor={id:"preview-katie",name:"Synthetic staff",email:"staff@preview.invalid",role:"operator",provider_id:"katie"};
const evidence:{check:string;result:unknown}[]=[];
function deferred(){let resolve!:()=>void;const promise=new Promise<void>(r=>resolve=r);return {promise,resolve};}
type Hook=(sql:string,run:()=>Promise<Row[]>)=>Promise<Row[]>;
function wrap(client:Client,hook?:Hook):Database{
 const query:Queryable["query"]=async <T extends Row>(sql:string,params:unknown[]=[])=>{
  const run=async()=> (await client.query(sql,params)).rows;
  return (hook?await hook(sql,run):await run()) as T[];
 };
 return {query,transaction:async fn=>{await client.query("BEGIN");try{const result=await fn({query});await client.query("COMMIT");return result;}catch(error){await client.query("ROLLBACK");throw error;}}};
}
let nextDay=DateTime.now().setZone("America/Chicago").startOf("day").plus({days:4});
function time(hour=10){do{nextDay=nextDay.plus({days:1});}while(![2,3,4,5,6].includes(nextDay.weekday));return nextDay.set({hour}).toUTC().toISO()!;}
try{
 await admin.query(`CREATE DATABASE ${databaseName}`);
 async function connect(){const c=new Client({...connection,database:databaseName});await c.connect();await c.query("SET statement_timeout='15s'");dbClients.push(c);return c;}
 const setup=await connect(),online=await connect(),manual=await connect(),observer=await connect();
 const db=wrap(setup);await schema(db);await seed(db);
 await db.query("INSERT INTO reserve_services(id,provider_id,name,description,minutes,buffer,price,enabled) VALUES('pg-exact-25','katie','Synthetic 25','Isolated only',25,5,2500,true)");
 const crmId=randomUUID();await db.query("INSERT INTO reserve_clients(id,provider_id,user_id,name,email,source,source_key,created_by) VALUES($1,'katie','preview-client','Synthetic','test@preview.invalid','account','preview-client','preview-client')",[crmId]);
 // Exercise the real domain functions and foreign keys with a linked CRM client.
 for(const oldLock of [true,false]){
  const userLocked=deferred(),manualInsert=deferred(),date=time();
  const onlineDb=wrap(online,async(sql,run)=>{
   if(sql.includes("FROM reserve_users")&&sql.includes("FOR NO KEY UPDATE")){
    const rows=oldLock?(await online.query(sql.replace("FOR NO KEY UPDATE","FOR UPDATE"),[clientActor.id])).rows:await run();
    userLocked.resolve();await manualInsert.promise;return rows;
   }return run();
  });
  const manualDb=wrap(manual,async(sql,run)=>{if(sql.startsWith("INSERT INTO reserve_appointments"))manualInsert.resolve();return run();});
  const intent={serviceId:"pg-exact-25",locationId:"eunice",start:date,note:"Synthetic lock test",requestKey:randomUUID()};
  const onlineResult=book(onlineDb,clientActor,intent).then(value=>({ok:true as const,value}),error=>({ok:false as const,code:error.code}));
  await userLocked.promise;
  const manualResult=manualAppointment(manualDb,staff,{provider:"katie",clientId:crmId,serviceId:"pg-exact-25",locationId:"eunice",start:DateTime.fromISO(date).plus({hours:1}).toISO(),requestKey:randomUUID()}).then(value=>({ok:true as const,value}),error=>({ok:false as const,code:error.code}));
  const results=await Promise.all([onlineResult,manualResult]);
  if(oldLock)assert.ok(results.some(r=>!r.ok&&r.code==="40P01"),"Old user FOR UPDATE cycle must reproduce a real PostgreSQL deadlock");
  else assert.ok(results.every(r=>r.ok),"NO KEY UPDATE permits manual user FK while preserving provider serialization");
  evidence.push({check:oldLock?"old-lock linked CRM cycle":"corrected online/manual interleaving",result:results.map(r=>r.ok?"committed":r.code)});
 }
 // Both ordering cases must really block on the shared account mutex; inspect
 // pg_blocking_pids from a third session rather than relying on a timing sleep.
 for(const first of ["book","recover"] as const){
  const locked=deferred(),release=deferred(),intent={serviceId:"pg-exact-25",locationId:"eunice",start:time(),note:"Synthetic recovery race",requestKey:randomUUID()};
  const firstDb=wrap(online,async(sql,run)=>{const rows=await run();if(sql.includes("FROM reserve_users")&&sql.includes("FOR NO KEY UPDATE")){locked.resolve();await release.promise;}return rows;});
  const firstRun=(first==="book"?book(firstDb,clientActor,intent):recoverBooking(firstDb,clientActor,intent.requestKey)).then(value=>({ok:true,value}),error=>({ok:false,code:error.code,status:error.status}));
  await locked.promise;
  const secondPid=(await manual.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
  const secondRun=(first==="book"?recoverBooking(wrap(manual),clientActor,intent.requestKey):book(wrap(manual),clientActor,intent)).then(value=>({ok:true,value}),error=>({ok:false,code:error.code,status:error.status}));
  let blocked=false;
  for(let i=0;i<100&&!blocked;i++){
   blocked=(await observer.query("SELECT cardinality(pg_blocking_pids($1))>0 AS blocked",[secondPid])).rows[0].blocked;
   if(!blocked)await new Promise(r=>setTimeout(r,10));
  }
  release.resolve();const results=await Promise.all([firstRun,secondRun]);assert.equal(blocked,true,"Competing transaction must wait for the request mutex");
  assert.equal(results[0].ok,true,"The first transaction must commit successfully");
  const recovered=await recoverBooking(db,clientActor,intent.requestKey);
  assert.equal(Boolean(recovered.appointment),first==="book");
  if(first==="recover"){
   assert.equal(results[1].ok,false);
   assert.ok("status" in results[1]&&results[1].status===409,"Only the explicit retired-request rejection is valid");
  }else assert.equal(results[1].ok,true,"Recovery must return the committed booking");
  const count=await db.query<{n:number}>("SELECT count(*)::int AS n FROM reserve_appointments WHERE client_id=$1 AND request_key=$2",[clientActor.id,intent.requestKey]);
  assert.equal(count[0].n,first==="book"?1:0);
  evidence.push({check:`${first}-first request serialization`,result:{blocked,appointments:count[0].n}});
 }
 const collisionStart=time();
 const collision=await Promise.allSettled([book(wrap(online),clientActor,{serviceId:"pg-exact-25",start:collisionStart,note:"",requestKey:randomUUID()}),book(wrap(manual),{...clientActor,id:"preview-other"},{serviceId:"pg-exact-25",start:DateTime.fromISO(collisionStart).plus({minutes:15}).toISO()!,note:"",requestKey:randomUUID()})]);
 assert.equal(collision.filter(r=>r.status==="fulfilled").length,1);evidence.push({check:"independent-account partial-slot collision",result:"exactly one appointment"});
 const version=(await setup.query("SELECT version() AS version")).rows[0].version;
 await mkdir("artifacts/katie-postgres",{recursive:true});await writeFile("artifacts/katie-postgres/results.json",JSON.stringify({head:execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim(),engine:version,target:"disposable loopback PostgreSQL on port 55439",hosted:false,evidence},null,2));
 console.log("PASS local PostgreSQL: old lock deadlock reproduced; corrected manual/online order and both recovery orderings passed; partial-slot collision protected.");
}finally{
 for(const c of dbClients)await c.end();
 await admin.query(`DROP DATABASE IF EXISTS ${databaseName}`);await admin.end();
}

}
main().catch(error=>{console.error(error);process.exitCode=1;});
