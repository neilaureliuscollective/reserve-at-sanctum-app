import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const base = process.env.EMBLEM_VERIFY_URL || 'http://127.0.0.1:3126/discover';
const server = process.env.EMBLEM_VERIFY_URL ? null : spawn(process.execPath, ['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3126'], {stdio:['ignore','pipe','pipe']});
let log='', browser;
try {
  if(server) await new Promise((resolve,reject)=>{
    server.stdout.on('data',d=>{log+=d;if(String(d).includes('Ready in'))resolve()});
    server.stderr.on('data',d=>log+=d);
    server.on('exit',()=>reject(Error(log)));
    setTimeout(()=>reject(Error(log)),30000).unref();
  });
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await mkdir('artifacts/emblems',{recursive:true});
  const selected=page.locator('.signature-sculpture:not(.is-quiet)');
  for(const width of [320,390,430,700,884,1440]) {
    await page.setViewportSize({width,height:900});
    await page.goto(base);
    const crest=page.locator('.living-crest');
    await crest.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.querySelector('.living-crest')?.dataset.crestState==='active');
    await crest.locator('img').evaluate(img=>img.decode());
    assert.equal(await page.locator('.living-crest canvas').count(),0);
    assert.equal(await crest.locator('img').evaluate(img=>getComputedStyle(img).opacity),'1');
    await page.getByRole('button',{name:'Pause crest and environment motion'}).click();
    await page.waitForFunction(()=>document.querySelector('.living-crest')?.dataset.crestState==='paused');
    assert.ok(await crest.locator('img').evaluate(img=>getComputedStyle(img).animationName==='none'||getComputedStyle(img).animationPlayState==='paused'));
    await page.reload();
    await crest.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.querySelector('.living-crest')?.dataset.crestState==='paused');
    await page.getByRole('button',{name:'Enable crest and environment motion'}).click();
    if(width===390||width===1440) await crest.screenshot({path:`artifacts/emblems/crest-${width}.png`});
    for(const [id,name,href] of [['presence','Presence','/pathways?priority=presence#routine'],['performance','Performance','/pathways?priority=performance#routine'],['wellness','Vitalis','/vitalis/journey']]) {
      await page.locator('.digital-world-controls').getByRole('button',{name:new RegExp(name)}).click();
      await selected.scrollIntoViewIfNeeded();
      await page.waitForFunction(()=>document.querySelector('.signature-sculpture:not(.is-quiet)')?.dataset.sculptureState==='active');
      await selected.locator('img').evaluate(img=>img.decode());
      assert.equal(await selected.getAttribute('data-world'),id);
      assert.match(await selected.locator('img').getAttribute('src'),new RegExp(`${id}-1280-v1`));
      assert.equal(await page.locator('.signature-sculpture canvas').count(),0);
      assert.equal(await page.locator('.digital-world-copy .button').getAttribute('href'),href);
      assert.equal(await selected.locator('img').evaluate(img=>getComputedStyle(img).opacity),'1');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}`);
      if(width===390||width===1440) await page.locator('.digital-world-preview').screenshot({path:`artifacts/emblems/${id}-${width}.png`});
    }
    console.log('Verified imagery, routing and pause persistence:',width);
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.reload();
  await selected.scrollIntoViewIfNeeded();
  await selected.locator('img').evaluate(img=>img.decode());
  assert.equal(await selected.locator('img').evaluate(img=>getComputedStyle(img).animationName),'none');
  assert.equal(await selected.locator('button').isVisible(),false);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>{localStorage.setItem('reserve-motion-v1','motion');document.documentElement.dataset.reserveStill='false'});
  await selected.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('.signature-sculpture:not(.is-quiet)')?.dataset.sculptureState==='active');
  await page.evaluate(()=>scrollTo({top:document.body.scrollHeight,behavior:'instant'}));
  await page.waitForFunction(()=>document.querySelector('.signature-sculpture:not(.is-quiet)')?.dataset.sculptureState==='paused');
  const hiddenPage=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:900}});
  await hiddenPage.goto(base);
  await hiddenPage.locator('.living-crest img').evaluate(img=>img.decode());
  assert.equal(await hiddenPage.locator('.living-crest img').evaluate(img=>getComputedStyle(img).opacity),'1');
  assert.deepEqual(errors,[]);
  console.log('Reduced motion, offscreen pause and no-JS artwork verified.');
} finally {
  await browser?.close();
  server?.kill('SIGTERM');
}
