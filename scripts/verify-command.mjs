import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
if(process.env.DATABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL)throw Error('Synthetic local environment only');
const origin=process.env.COMMAND_VERIFY_ORIGIN||'http://localhost:3003';
if(new URL(origin).hostname!=='localhost')throw Error('Local server only');
await mkdir('artifacts',{recursive:true});
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',new URL(origin).port],{env:{...process.env,RESERVE_DEV_PREVIEW:'true',APP_ORIGIN:origin,RESERVE_AI_ENABLED:'true',OPENAI_API_KEY:'reserve-fixture-not-a-key',RESERVE_AI_MODEL:'fixture',NODE_OPTIONS:'--require='+process.cwd()+'/scripts/fixtures/reserve-ai.cjs'},stdio:['ignore','pipe','pipe']});
let serverLog='';server.stdout.on('data',d=>serverLog+=d);server.stderr.on('data',d=>serverLog+=d);
await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server startup timed out')),30000);server.stdout.on('data',d=>{if(String(d).includes('Ready in')){clearTimeout(timer);resolve();}});server.on('exit',code=>{clearTimeout(timer);reject(Error('Server exited '+code+' '+serverLog));});});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
const errors=[];
const handoffTitle='Synthetic shared handoff '+randomUUID().slice(0,8);
async function context(identity){
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const r=await context.request.post(origin+'/api/auth',{headers:{Origin:origin},data:{action:'preview',identity}});assert.equal(r.status(),200);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
  return {context,page};
}
try{
  const neil=await context('preview-neil'),katie=await context('preview-katie'),client=await context('preview-client');
  await neil.page.goto(origin+'/studio');await neil.page.getByRole('heading',{name:/keep the Reserve moving/}).waitFor();
  await katie.page.goto(origin+'/studio');await katie.page.getByRole('heading',{name:/make every visit count/}).waitFor();
  for(const route of ['/api/studio/command','/api/studio/conversations','/api/studio/knowledge'])assert.equal((await client.context.request.get(origin+route)).status(),403);
  await neil.page.getByRole('button',{name:'Work',exact:true}).click();
  await neil.page.getByRole('button',{name:'Capture work',exact:true}).click();
  await neil.page.getByLabel('Headline',{exact:true}).fill(handoffTitle);
  await neil.page.getByLabel('Business detail',{exact:true}).fill('Review the opening experience.');
  await neil.page.getByRole('button',{name:'Save work',exact:true}).click();
  await neil.page.getByRole('heading',{name:handoffTitle,exact:true}).waitFor();
  const item=neil.page.locator('article').filter({has:neil.page.getByRole('heading',{name:handoffTitle,exact:true})});
  await item.getByLabel('Hand off '+handoffTitle).selectOption('preview-katie');
  await item.getByText(/Handoff to Katie/).waitFor();
  await katie.page.goto(origin+'/studio?tab=work');
  const received=katie.page.locator('article').filter({has:katie.page.getByRole('heading',{name:handoffTitle,exact:true})});
  await received.getByRole('button',{name:'Acknowledge handoff',exact:true}).click();await received.getByText(/acknowledged/).waitFor();
  await received.getByRole('button',{name:'Mark complete',exact:true}).click();await received.getByRole('button',{name:'Reopen work',exact:true}).waitFor();
  const privateRoom=await (await katie.context.request.post(origin+'/api/studio/conversations',{headers:{Origin:origin},data:{title:'Katie private check'}})).json();
  assert.equal((await neil.context.request.get(origin+'/api/studio/conversations?room='+privateRoom.room.id)).status(),404);
  await neil.page.goto(origin+'/studio?tab=talk');
  await neil.page.getByRole('button',{name:'Conversation rooms',exact:true}).click();
  await neil.page.getByRole('button',{name:'Create Operations Room',exact:true}).click();
  await neil.page.getByText(/Shared with/).waitFor();
  await neil.page.getByLabel('Message Aethelios',{exact:true}).fill('Brief us on the work.');
  await neil.page.getByRole('button',{name:'Send message to Aethelios',exact:true}).click();
  await neil.page.getByText('Synthetic transport verification:',{exact:false}).waitFor();
  await neil.page.reload();await neil.page.getByText('Synthetic transport verification:',{exact:false}).waitFor();
  await neil.page.getByText(/Records used/).waitFor();
  await katie.page.goto(origin+'/studio?tab=talk');await katie.page.getByText('Synthetic transport verification:',{exact:false}).waitFor();
  // Explicit room removal is checked through its API; Katie loses the read immediately.
  const rooms=await (await neil.context.request.get(origin+'/api/studio/conversations')).json();
  const shared=rooms.rooms.find(r=>r.scope==='shared');assert.ok(shared);
  for(const width of [320,390,540,884,1440,2560]){
    for(const tab of ['today','talk']){
      await neil.page.setViewportSize({width,height:width>1400?1440:900});
      await neil.page.goto(origin+'/studio?tab='+tab);
      await neil.page.getByRole('button',{name:tab==='talk'?'Send message to Aethelios':'Brief me',exact:tab==='talk'}).waitFor();
      if(tab==='talk')await neil.page.getByText('Synthetic transport verification:',{exact:false}).waitFor();
      else await neil.page.getByText(/Updated .* CT/).first().waitFor();
      assert.ok(await neil.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow '+width+' '+tab);
      if(tab==='talk'){
        const box=await neil.page.getByLabel('Message Aethelios',{exact:true}).boundingBox();assert.ok(box.width>200&&box.height>=90,'usable composer');
        const send=await neil.page.getByRole('button',{name:'Send message to Aethelios'}).boundingBox();
        assert.ok(send.y+send.height<(await neil.page.viewportSize()).height-60,'composer visible above mobile controls');
      }
      await neil.page.screenshot({path:`artifacts/command-${tab}-${width}.png`,fullPage:true});
    }
  }
  await katie.page.emulateMedia({reducedMotion:'reduce'});await katie.page.goto(origin+'/studio?tab=talk');
  assert.equal(await katie.page.locator('[aria-hidden=true]').first().evaluate(el=>getComputedStyle(el).animationName),'none');
  assert.equal((await neil.context.request.post(origin+'/api/studio/command',{headers:{Origin:'https://wrong.invalid'},data:{}})).status(),403);
  assert.equal((await neil.context.request.delete(origin+'/api/studio/conversations',{headers:{Origin:origin},data:{room_id:shared.id,member_id:'preview-katie'}})).status(),200);
  assert.equal((await katie.context.request.get(origin+'/api/studio/conversations?room='+shared.id)).status(),404);
  assert.deepEqual(errors,[]);
  console.log('PASS command: role dashboards, client denial, task persistence/handoffs, private/shared rooms, background AI fixture/persistence, sources, revocation, six widths, reduced motion, no page errors. Provider transport is synthetic.');
}catch(e){await writeFile('artifacts/command-server.log',serverLog);throw e;}finally{await browser.close();server.kill('SIGTERM');}
