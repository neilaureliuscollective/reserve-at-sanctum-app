import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,writeFile,readFile,rm} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import path from "node:path";
import os from "node:os";
import {pathToFileURL} from "node:url";
test("synthetic browser verification detects hosted credentials and enabled email in Next local env files before startup",async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),"booking-verification-"));
 const helper=pathToFileURL(path.resolve("scripts/synthetic-verification.mjs")).href;
 const childEnv: NodeJS.ProcessEnv={...process.env,NODE_ENV:"development"};delete childEnv.DATABASE_URL;delete childEnv.NEXT_PUBLIC_SUPABASE_URL;delete childEnv.RESERVE_BOOKING_EMAIL_ENABLED;
 const code=`import {writeFileSync} from 'node:fs'; import {assertSyntheticVerification} from ${JSON.stringify(helper)};try{assertSyntheticVerification();writeFileSync('result','allowed')}catch{writeFileSync('result','blocked')}`;
 const run=()=>{const result=spawnSync(process.execPath,["--input-type=module","-e",code],{cwd:directory,env:childEnv,timeout:10000,stdio:"ignore"});assert.equal(result.status,0);};
 try{
  run();assert.equal(await readFile(path.join(directory,"result"),"utf8"),"allowed");
  await writeFile(path.join(directory,".env.local"),"DATABASE_URL=postgresql://fixture.invalid/db\n");run();assert.equal(await readFile(path.join(directory,"result"),"utf8"),"blocked");
  await writeFile(path.join(directory,".env.local"),"RESERVE_BOOKING_EMAIL_ENABLED=true\n");run();assert.equal(await readFile(path.join(directory,"result"),"utf8"),"blocked");
 }finally{await rm(directory,{recursive:true,force:true});}
});
