import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
if(process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) throw Error('Synthetic local preview only');
const base='http://localhost:3000';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1'],{env:{...process.env,RESERVE_DEV_PREVIEW:'true',APP_ORIGIN:base},stdio:['ignore','pipe','pipe']});
server.stderr.on("data",d=>process.stderr.write(d));
try{
await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('Ready in'))resolve();});server.on('exit',c=>reject(Error('Server exited '+c)));setTimeout(()=>reject(Error('startup timeout')),30000).unref();});
let r=await fetch(base+'/');assert.equal(r.status,200);assert.match(await r.text(),/Enter the Reserve/);
r=await fetch(base+'/',{headers:{cookie:'reserve-arrival-v1=seen'},redirect:'manual'});assert.equal(r.headers.get('location'),'/home');
for(const [id,target] of [['preview-client','/home'],['preview-katie','/studio'],['preview-neil','/studio']]){
const login=await fetch(base+'/api/auth',{method:'POST',headers:{'content-type':'application/json',origin:base},body:JSON.stringify({action:'preview',identity:id})});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
for(const path of ['/enter','/']){const response=await fetch(base+path,{headers:{cookie},redirect:'manual'});assert.equal(response.headers.get('location'),target);}
const html=await(await fetch(base+target,{headers:{cookie}})).text();assert.match(html,id==='preview-client'?/No upcoming visit is booked/:id==='preview-katie'?/Your working day/:/Reserve Command/);
}
r=await fetch(base+'/manifest.webmanifest');assert.equal((await r.json()).start_url,'/enter');
r=await fetch(base+'/book?service=test');assert.equal(r.status,200);assert.doesNotMatch(await r.text(),/class="reserve-threshold/);
console.log('HTTP proof passed: arrival, returning cookie, three role destinations, honest empty state, staff schedule-first, manifest, direct booking.');
}finally{server.kill('SIGTERM');}
