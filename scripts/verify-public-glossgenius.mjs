import { chromium } from "@playwright/test";
import { spawn, execFileSync } from "node:child_process";
import { mkdir, writeFile, access } from "node:fs/promises";
import assert from "node:assert/strict";
// Do not inherit hosted credentials or local env files into either phase.
if (process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.RESERVE_BOOKING_EMAIL_ENABLED === "true") throw Error("Isolated local verification only");
for (const file of [".env.local",".env.development.local",".env.development",".env"]) {
  await access(file).then(()=>{throw Error("Remove hosted/local env files before isolated verification");},()=>{});
}
const origin="http://localhost:3000", gg="https://fixitshop.glossgenius.com/", dir="artifacts/public-glossgenius";
await mkdir(dir,{recursive:true});
let server, browser, activePage, logs="";
const checks=[], errors=[], externalRequests=[], mutations=[];
async function start(preview) {
  server=spawn(process.execPath,["node_modules/next/dist/bin/next","dev","--hostname","127.0.0.1","--port","3000"],{
    env:{...process.env,RESERVE_DEV_PREVIEW:String(preview),APP_ORIGIN:origin},stdio:["ignore","pipe","pipe"],
  });
  let ready=false;
  server.stdout.on("data",d=>{logs+=d;if(String(d).includes("Ready in"))ready=true;});server.stderr.on("data",d=>logs+=d);
  const deadline=Date.now()+60000;
  while(Date.now()<deadline) {
    if(server.exitCode!==null)throw Error("Server stopped");
    try {if(ready && (await fetch(origin+"/fix-it-shop/app",{signal:AbortSignal.timeout(4000)})).ok)return;} catch {}
    await new Promise(r=>setTimeout(r,250));
  }
  throw Error("Application readiness timeout");
}
async function stop() {
  if(server?.exitCode===null){server.kill("SIGTERM");await new Promise(r=>server.once("exit",r));}
}
async function context(options={}) {
  const c=await browser.newContext({viewport:{width:390,height:844},...options});
  c.on("page",p=>p.on("pageerror",e=>errors.push(e.message)));
  c.on("request",r=>{if(!["GET","HEAD"].includes(r.method()))mutations.push({url:r.url(),method:r.method()});});
  // Capture an actual top-level navigation request, without contacting a merchant.
  await c.route("**/*",route=>{
    const r=route.request(),u=new URL(r.url());
    if(u.origin===origin)return route.continue();
    if(u.origin===new URL(gg).origin){
      externalRequests.push({url:r.url(),method:r.method()});
      return route.fulfill({status:200,contentType:"text/html",body:"<title>Captured handoff</title><p>Local navigation fixture; no merchant request sent.</p>"});
    }
    return route.abort();
  });
  return c;
}
try {
  await start(false);
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||"/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage"]});
  const c=await context(), page=await c.newPage();activePage=page;page.setDefaultTimeout(20000);
  for(const path of ["/fix-it-shop/app","/fix-it-shop","/fix-it-shop/app/founder","/fix-it-shop/app/install","/privacy"]) {
    await page.goto(origin+path);
    assert.ok(await page.locator(`a[href="${gg}"]`).count(),path);
    assert.equal(await page.locator('a[href^="/fix-it-shop/app/book"],a[href^="/fix-it-shop/app/appointments"]').count(),0,path);
    for(const width of [320,390,540,884,1440]) {
      await page.setViewportSize({width,height:900});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${path} overflow ${width}`);
    }
    if(path==="/fix-it-shop/app"||path==="/fix-it-shop") {
      await page.setViewportSize({width:390,height:844});
      await page.screenshot({path:dir+(path==="/fix-it-shop"?"/story-mobile.png":"/home-mobile.png"),fullPage:true});
    }
  }
  checks.push("Five public pages: direct destination links, no native booking/visit entry links, no overflow at five mobile/Fold/desktop widths");
  await page.setViewportSize({width:390,height:844});
  await page.goto(origin+"/fix-it-shop/app");
  await page.locator('.fis-entrance__copy a[href="#services"]').click();
  await page.waitForFunction(()=>location.hash==="#services");
  await page.locator('a[href="/fix-it-shop/app/founder"]').first().click();
  await page.waitForURL("**/fix-it-shop/app/founder");
  await page.locator("#founder-title").waitFor({state:"visible"});
  await page.goBack();await page.waitForURL("**/fix-it-shop/app#services");
  const hero=page.locator(`.fis-entrance__copy a[href="${gg}"]`);
  await hero.focus();await page.keyboard.press("Enter");await page.waitForURL(gg);
  await page.goBack();await page.waitForURL("**/fix-it-shop/app#services");
  checks.push("Mobile keyboard Enter navigates directly to exact GlossGenius URL in the same tab; internal anchor/story navigation and browser Back restore the website");
  await page.goto(origin+"/fix-it-shop");
  await page.getByRole("button",{name:"Show the still view"}).waitFor();
  await page.locator("#experience").evaluate(el=>el.scrollIntoView({block:"start",behavior:"instant"}));
  await page.locator(`.katie-booking-shortcut a[href="${gg}"]`).waitFor({state:"visible"});
  checks.push("Scrolled mobile sticky action uses direct GlossGenius link");
  for(const path of ["/book","/book?provider=katie&service=old-native-id","/book?location=eunice","/fix-it-shop/app/book?service=old-id","/fix-it-shop/app/appointments"]) {
    await page.goto(origin+path);await page.waitForURL(gg);
  }
  for(const path of ["/book?provider=synthetic-other","/book?location=other-house","/book?service=unknown"]) {
    await page.goto(origin+path);assert.equal(new URL(page.url()).pathname,"/book");
    await page.getByRole("list",{name:"Booking progress"}).waitFor();
  }
  checks.push("Five legacy Katie/default routes redirect without signup/calendar screens; unknown/other-provider intent remains on native routes");
  for(const path of ["/manifest.webmanifest","/fix-it-shop/booking.webmanifest"]) {
    const m=await (await c.request.get(origin+path)).json();
    const items=m.shortcuts.filter(s=>s.name.includes("GlossGenius"));assert.equal(items.length,2);
    assert.ok(items.every(s=>s.url==="/fix-it-shop/app/book"));
  }
  const nojs=await context({javaScriptEnabled:false}), np=await nojs.newPage();
  await np.goto(origin+"/fix-it-shop/app");
  await np.locator(`.reserve-no-script a[href="${gg}"]`).first().click();await np.waitForURL(gg);await nojs.close();
  checks.push("Both PWA manifests expose labeled in-scope immediate handoff shortcuts; no-JavaScript fallback booking link works");
  await c.close();await stop();
  execFileSync(process.execPath,["--import","tsx","scripts/fixtures/public-handoff.ts"],{stdio:"pipe"});
  await start(true);
  const pc=await context(), pp=await pc.newPage();
  await pp.goto(origin+"/fix-it-shop/app/book?service=signature");
  await pp.getByRole("button",{name:/Signature grooming/}).waitFor();
  await pp.goto(origin+"/providers/synthetic-other/app");
  assert.equal(await pp.locator(`main a[href="${gg}"]`).count(),0);
  await pp.getByRole("link",{name:/Book a visit/}).click();await pp.waitForURL("**/providers/synthetic-other/app/book");
  await pp.getByRole("button",{name:/Synthetic other service/}).waitFor();
  assert.equal(await pp.getByRole("button",{name:/Signature grooming/}).count(),0);
  await pp.goto(origin+"/visit");
  await pp.getByRole("button",{name:/Katie/}).click();
  assert.ok(await pp.locator(`.sanctum-services a[href="${gg}"]`).count());
  await pp.getByRole("button",{name:/Synthetic Other/}).click();
  assert.equal(await pp.locator(`.sanctum-services a[href="${gg}"]`).count(),0);
  assert.ok(await pp.locator('.sanctum-services a[href*="provider=synthetic-other"]').count());
  const pm=await(await pc.request.get(origin+"/providers/synthetic-other/booking.webmanifest")).json();
  assert.ok(pm.shortcuts.every(s=>s.url.startsWith("/providers/synthetic-other/")));
  checks.push("Isolated native Katie preview remains reachable; synthetic other-provider home/book/manifest and shared directory retain their own services and URLs");
  await pc.close();assert.deepEqual(errors,[]);assert.deepEqual(mutations,[]);
  assert.ok(externalRequests.length>=7);assert.ok(externalRequests.every(r=>r.url===gg&&r.method==="GET"));
  await writeFile(dir+"/results.json",JSON.stringify({checks,externalRequests,mutations,errors,synthetic:true,merchantNetwork:"intercepted locally; no real booking/payment/email/provider generation"},null,2));
  console.log("PASS public GlossGenius handoff: "+checks.join("; "));
} catch(error) {
  if(activePage && !activePage.isClosed()) {
    await activePage.screenshot({path:dir+"/failure.png",fullPage:true}).catch(()=>{});
    await writeFile(dir+"/failure.json",JSON.stringify({url:activePage.url(),checks,error:String(error),mutations},null,2));
    await writeFile(dir+"/failure.html",await activePage.content().catch(()=>""));
  }
  throw error;
} finally {
  await browser?.close();await stop();await writeFile(dir+"/server.log",logs);
}
