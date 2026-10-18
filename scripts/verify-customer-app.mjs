import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import assert from "node:assert/strict";
import sharp from "sharp";
if (process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.RESERVE_BOOKING_EMAIL_ENABLED === "true") throw Error("Isolated local verification only");
for (const file of [".env.local", ".env.development.local", ".env.development", ".env"]) await access(file).then(()=>{throw Error("Use an isolated checkout without env files");},()=>{});
const origin="http://localhost:3000", base="/fix-it-shop-app/index.html", gg="https://fixitshop.glossgenius.com/", dir="artifacts/customer-app";
await mkdir(dir,{recursive:true});
let logs="", browser, activePage;
const checks=[],errors=[],external=[],writes=[],appApiRequests=[];
const server=spawn(process.execPath,["node_modules/next/dist/bin/next",process.argv.includes("--production")?"start":"dev","--hostname","127.0.0.1","--port","3000"],{env:{...process.env,RESERVE_DEV_PREVIEW:"false",APP_ORIGIN:origin},stdio:["ignore","pipe","pipe"]});
let ready=false;server.stdout.on("data",d=>{logs+=d;if(String(d).includes("Ready in"))ready=true;});server.stderr.on("data",d=>logs+=d);
async function newContext(options={}) {
  const c=await browser.newContext({viewport:{width:390,height:844},...options});
  c.on("page",p=>p.on("pageerror",e=>errors.push(e.message)));
  c.on("request",r=>{if(!["GET","HEAD"].includes(r.method()))writes.push({url:r.url(),method:r.method()});if(new URL(r.url()).pathname.startsWith("/api/"))appApiRequests.push(r.url());});
  await c.route("https://fixitshop.glossgenius.com/**",r=>{external.push({url:r.request().url(),method:r.request().method()});return r.fulfill({contentType:"text/html",body:"<title>Captured GlossGenius handoff</title><p>Local fixture only.</p>"});});
  return c;
}
async function screen(p,name){await p.locator(`.app-nav a[href="#${name}"]`).click();await p.waitForFunction(n=>document.querySelector(`[data-screen="${n}"]`).hidden===false,name);}
try {
  const deadline=Date.now()+60000;
  while(Date.now()<deadline){if(server.exitCode!==null)throw Error("Server stopped");try{if(ready&&(await fetch(origin+base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||"/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage"]});
  const c=await newContext(), p=await c.newPage();activePage=p;p.setDefaultTimeout(20000);
  await p.goto(origin+base+"#home");
  await p.waitForFunction(()=>document.querySelector("#offline-ready").textContent.includes("offline copy is ready"));
  await p.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  assert.equal(await p.locator("#install-promotion").isVisible(),false);
  const book=p.locator('[data-screen="home"] [data-book]:visible');
  assert.equal(await book.getAttribute("href"),gg);
  assert.equal(await p.locator('[data-book]').evaluateAll((nodes, destination)=>nodes.every(node=>node.href===destination),gg),true);
  const box=await book.boundingBox();assert.ok(box.y+box.height<844-80,"Booking must be visible without scrolling");
  checks.push("Compact browser entry; immediate direct booking; install promotion absent before value");
  assert.equal(await p.locator("#card-form").count(),1);
  assert.equal(await p.locator('[data-screen="home"] input,[data-screen="home"] textarea,[data-screen="home"] button[type="submit"]').count(),0);
  assert.equal(await p.locator('img[src*="images/approved/fix-it-shop"],img[src*="icons/192"]').count(),0);
  assert.equal(await p.locator('img[data-approved-logo]').count(),3);
  assert.equal(await p.locator('img[data-approved-logo]').evaluateAll(nodes=>nodes.every(img=>new URL(img.src).pathname==="/fix-it-shop-app/identity/hero-emblem-280.webp")),true);
  assert.equal(await p.locator('.crest-slot').first().evaluate(el=>getComputedStyle(el).backgroundImage),"none");
  assert.equal(await p.locator('.home-stage img[data-approved-logo]').evaluate(el=>getComputedStyle(el).animationName),"emblem-breathe");
  assert.equal(await p.getByText(/Approved crest.*not available/).count(),0);
  await p.locator('.shop-path').click();await p.locator('[data-screen="shop"]:visible').waitFor();
  await screen(p,"home");await p.locator('.prepare-path').click();await p.locator('[data-screen="card"]:visible').waitFor();
  await screen(p,"home");
  checks.push("Home paths navigate to the existing shop/card; one authoritative form; approved transparent center emblem appears in all three identity slots");

  for(const width of [320,390,540,884,1440]) {
    await p.setViewportSize({width,height:900});
    for(const name of ["home","services","card","shop","katie"]) {
      await screen(p,name);
      assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${name} overflow ${width}`);
      const tiny=await p.locator("a,button,summary").evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0).some(r=>r.height<44||r.width<44));assert.equal(tiny,false,`Small touch target ${name} ${width}`);
      await p.evaluate(()=>document.fonts.ready);
      if([390,884].includes(width))await p.screenshot({path:`${dir}/${name}-${width}.png`,fullPage:true});
    }
  }
  assert.equal(await p.locator('img[src*="katie-guidry"]').count(),0);
  const reduced=await newContext({viewport:{width:320,height:660},reducedMotion:"reduce"});
  const reducedPage=await reduced.newPage();await reducedPage.goto(origin+base+"#home");await reducedPage.evaluate(()=>document.fonts.ready);
  assert.equal(await reducedPage.evaluate(()=>matchMedia("(prefers-reduced-motion: reduce)").matches),true);
  assert.equal(await reducedPage.locator(".home-stage").evaluate(el=>getComputedStyle(el).animationName),"none");
  assert.equal(await reducedPage.locator('.home-stage img[data-approved-logo]').evaluate(el=>getComputedStyle(el).animationName),"none");
  const reducedBook=await reducedPage.locator('[data-screen="home"] [data-book]:visible').boundingBox();assert.ok(reducedBook.y+reducedBook.height<660-80);
  await reducedPage.locator(".quick-book").focus();assert.equal(await reducedPage.locator(".quick-book").evaluate(el=>getComputedStyle(el).outlineWidth),"3px");
  const dock=await reducedPage.locator(".app-nav").boundingBox();assert.ok(dock.y+dock.height<=660);
  await reducedPage.screenshot({path:dir+"/reduced-home-320.png",fullPage:true});await reduced.close();
  checks.push("Five app screens at phone/Fold/desktop widths; touch controls; brand-led Katie screen with no generated portrait");
  await p.setViewportSize({width:390,height:844});
  await screen(p,"card");assert.equal(await p.evaluate(()=>document.activeElement.id),"card-title");
  await p.getByLabel("What would you like to change?").fill("Synthetic: less length at the sides.");
  await p.getByLabel("What would you like to keep?").fill("Synthetic: keep the texture.");
  await p.getByLabel("Questions for Katie",{exact:true}).fill("Synthetic: <script>never execute</script>\nA question for the conversation.");
  await p.getByRole("button",{name:"Save on this device"}).dblclick();
  await p.getByText("Saved on this device. Not sent to Katie.",{exact:true}).waitFor();
  const stored=await p.evaluate(()=>localStorage.getItem("fix-it-consultation:v1"));
  assert.equal(JSON.parse(stored).version,1);
  assert.equal(await p.locator("#install-promotion").isVisible(),true);
  await p.getByRole("button",{name:"Not now"}).click();
  await p.locator("#show-link").click();await p.locator('[data-screen="show"]:visible').waitFor();
  assert.equal(await p.locator("#show-content script").count(),0);assert.match(await p.locator("#show-content").innerText(),/<script>never execute<\/script>/);
  await p.screenshot({path:dir+"/show-katie-390.png",fullPage:true});
  await p.goBack();await p.locator('[data-screen="card"]:visible').waitFor();
  await p.goForward();await p.locator('[data-screen="show"]:visible').waitFor();
  checks.push("Explicit save, repeated save, safe text-only Show Katie, focus and browser Back/Forward; install promotion only after saving and dismissible");
  await screen(p,"card");
  await p.getByLabel("What would you like to keep?").fill("Synthetic unsaved edit retained on return.");
  await p.reload();await p.getByLabel("What would you like to keep?").waitFor();
  await p.getByText("Draft kept for this tab. Choose Save to keep it on this device.",{exact:true}).waitFor();
  const beforeKeys=await p.evaluate(()=>Object.keys(localStorage));
  const directBook=p.locator(".quick-book");await directBook.focus();await p.keyboard.press("Enter");await p.waitForURL(gg);
  await p.goBack();await p.waitForURL("**/fix-it-shop-app/index.html#card");
  await screen(p,"card");assert.equal(await p.getByLabel("What would you like to keep?").inputValue(),"Synthetic unsaved edit retained on return.");
  assert.equal(await p.evaluate(()=>localStorage.getItem("fix-it-consultation:v1")),stored);
  assert.deepEqual(await p.evaluate(()=>Object.keys(localStorage)),beforeKeys);
  await screen(p,"home");
  await p.evaluate(()=>{const a=document.querySelector('[data-screen="home"] [data-book]');a.click();a.click();});await p.getByText("Local fixture only.",{exact:true}).waitFor();assert.equal(p.url(),gg);await p.goBack();
  await p.locator('[data-screen="home"]:visible').waitFor();
  assert.equal(await p.evaluate(()=>localStorage.getItem("fix-it-consultation:v1")),stored);
  await p.locator('.header-help').click();await p.locator('[data-screen="visit"]:visible').waitFor();
  assert.match(await p.locator('[data-screen="visit"]').innerText(),/actual GlossGenius confirmation/);
  assert.equal(await p.locator('a[href*="glossgenius.com/"]').evaluateAll(nodes=>nodes.every(n=>n.href==="https://fixitshop.glossgenius.com/")),true);
  checks.push("Keyboard and repeated booking handoffs preserve saved/draft state on return; no completion inference or invented management deep link; honest Visit help");
  await screen(p,"home");
  await p.evaluate(()=>{window.__shares=[];let resolve;window.__releaseShare=()=>resolve();Object.defineProperty(navigator,"share",{configurable:true,value:data=>{window.__shares.push(data);return new Promise(r=>{resolve=r;});}});});
  await p.getByRole("button",{name:"Share Fix It Shop"}).click();
  assert.equal(await p.locator("#share").isDisabled(),true);assert.equal(await p.evaluate(()=>window.__shares.length),1);
  const payload=await p.evaluate(()=>window.__shares[0]);assert.equal(payload.url,origin+"/fix-it-shop/app");assert.doesNotMatch(JSON.stringify(payload),/Synthetic|questions|texture/);
  await p.evaluate(()=>window.__releaseShare());await p.waitForFunction(()=>!document.querySelector("#share").disabled);
  await p.evaluate(()=>Object.defineProperty(navigator,"share",{configurable:true,value:undefined}));
  await p.getByRole("button",{name:"Share Fix It Shop"}).click();await p.locator("#share-fallback:visible").waitFor();
  assert.equal(await p.locator("#share-link").inputValue(),origin+"/fix-it-shop/app");
  await p.evaluate(()=>Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:async text=>{window.__copied=text;}}}));
  await p.getByRole("button",{name:"Copy website link"}).click();assert.equal(await p.evaluate(()=>window.__copied),origin+"/fix-it-shop/app");
  checks.push("Native share capability with repeat-click guard; clipboard/manual fallback; only website URL is shared, never consultation content");
  const cached=await p.evaluate(async()=>{const keys=await caches.keys();const result={};for(const key of keys){result[key]=(await(await caches.open(key)).keys()).map(r=>new URL(r.url).pathname);}return result;});
  const allowed=[base,"/fix-it-shop-app/app.css","/fix-it-shop-app/concept.css","/fix-it-shop-app/app.mjs","/fix-it-shop-app/state.mjs","/fix-it-shop-app/presentation.mjs","/fix-it-shop-app/fonts/display-regular.woff2","/fix-it-shop-app/fonts/display-italic.woff2","/fix-it-shop-app/fonts/sans-regular.woff2","/fix-it-shop-app/fonts/sans-semibold.woff2","/fix-it-shop-app/materials/home-grain.png","/fix-it-shop-app/materials/stage-phone.webp","/fix-it-shop-app/materials/stage-wide.webp"];
  allowed.push(...["hero-emblem-280.webp","favicon-16.png","favicon-32.png","favicon.ico","icon-180.png"].map(name=>"/fix-it-shop-app/identity/"+name));
  assert.ok(cached["fix-it-pocket-public-v18"]?.length>=17);assert.ok(cached["fix-it-pocket-public-v18"].every(path=>allowed.includes(path)));
  const workerScope=await p.evaluate(async()=> (await navigator.serviceWorker.getRegistration()).scope);assert.equal(workerScope,origin+"/fix-it-shop-app/");
  await c.setOffline(true);
  await p.locator("#connection:visible").waitFor();
  const reopened=await c.newPage();await reopened.goto(origin+base+"#card");
  await reopened.getByLabel("What would you like to change?").waitFor();assert.equal(await reopened.getByLabel("What would you like to change?").inputValue(),JSON.parse(stored).change);
  // Chromium network emulation resets navigator.onLine after a cached new-document
  // navigation. The reopen above already happened with transport offline; now
  // re-toggle transport to deliver the browser offline event to the new target.
  await c.setOffline(false); await c.setOffline(true);
  await reopened.locator("#connection:visible").waitFor();
  await reopened.getByRole("button",{name:"Save on this device"}).click();
  await reopened.locator("#show-link").click();await reopened.locator('[data-screen="show"]:visible').waitFor();
  await reopened.screenshot({path:dir+"/offline-show-390.png",fullPage:true});
  await reopened.locator('.header-help').click();await reopened.locator('[data-screen="visit"]:visible').waitFor();const offlineBook=reopened.locator('[data-screen="visit"] [data-book]');
  assert.equal(await offlineBook.getAttribute("aria-disabled"),"true");await offlineBook.focus();assert.equal(await offlineBook.evaluate(el=>el===document.activeElement),true);await reopened.keyboard.press("Enter");
  assert.equal(new URL(reopened.url()).origin,origin);await reopened.getByText("Reconnect to open that site. Your consultation card stays here.",{exact:true}).waitFor();
  await screen(reopened,"card");await reopened.getByRole("button",{name:"Delete card & draft"}).click();
  await reopened.getByRole("button",{name:"Keep card",exact:true}).click();assert.ok(await reopened.evaluate(()=>localStorage.getItem("fix-it-consultation:v1")));
  await reopened.getByRole("button",{name:"Delete card & draft"}).click();await reopened.getByRole("button",{name:"Delete card",exact:true}).click();
  assert.equal(await reopened.evaluate(()=>localStorage.getItem("fix-it-consultation:v1")),null);assert.equal(await reopened.evaluate(()=>sessionStorage.getItem("fix-it-consultation-draft:v1")),null);
  await p.waitForFunction(()=>sessionStorage.getItem("fix-it-consultation-draft:v1")===null);
  await reopened.reload();await reopened.getByLabel("What would you like to change?").waitFor();assert.equal(await reopened.getByLabel("What would you like to change?").inputValue(),"");
  await c.setOffline(false);await reopened.close();await c.close();
  checks.push("Scoped public-only offline cache; offline fresh-page reopening/read/edit/delete; honest blocked external booking while offline; deleted card stays deleted after reload");
  const standalone=await newContext();
  await standalone.addInitScript(()=>{const original=window.matchMedia.bind(window);window.matchMedia=q=>q==="(display-mode: standalone)"?{...original(q),matches:true,addEventListener(){},removeEventListener(){}}:original(q);});
  const sp=await standalone.newPage();await sp.goto(origin+"/enter",{waitUntil:"commit"});await sp.waitForURL("**/fix-it-shop-app/index.html#home",{waitUntil:"domcontentloaded"});
  await sp.getByRole("heading",{name:/Your time/}).waitFor();await sp.screenshot({path:dir+"/standalone-home-390.png",fullPage:true});
  await sp.goto(origin+"/fix-it-shop/app");await sp.getByRole("heading",{name:/A little time/}).waitFor();assert.equal(new URL(sp.url()).pathname,"/fix-it-shop/app");
  for(const path of ["/manifest.webmanifest","/fix-it-shop/booking.webmanifest"]){
    const manifest=await(await standalone.request.get(origin+path)).json();
    assert.equal(manifest.start_url,base+"#home");assert.equal(manifest.scope,"/");assert.equal(manifest.display,"standalone");
    assert.equal(manifest.id,path==="/manifest.webmanifest"?"/":"/fix-it-shop/app");
    assert.ok(manifest.icons.some(icon=>icon.purpose==="maskable"));
    for(const icon of manifest.icons){
      const response=await standalone.request.get(origin+icon.src);assert.equal(response.status(),200);
      const bytes=await response.body(),[width,height]=icon.sizes.split("x").map(Number);
      assert.equal(bytes.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
      assert.equal(bytes.readUInt32BE(16),width);assert.equal(bytes.readUInt32BE(20),height);
      assert.deepEqual(bytes,await readFile(`public/fix-it-shop/app/icons/${icon.purpose==="maskable"?"512-maskable":width}.png`));
    }
  }
  // Verify root identity pixels too: a legacy public file can take precedence
  // over metadata assets. Container compression differences are not identity.
  async function approvedPixels(bytes,path,size){
    const meta=await sharp(bytes).metadata();assert.equal(meta.width,size);assert.equal(meta.height,size);
    assert.deepEqual(await sharp(bytes).removeAlpha().raw().toBuffer(),await sharp(await readFile(path)).removeAlpha().raw().toBuffer());
    const rgba=await sharp(bytes).ensureAlpha(1).raw().toBuffer();
    for(let at=3;at<rgba.length;at+=4)assert.equal(rgba[at],255);
  }
  const favicon=await(await standalone.request.get(origin+"/favicon.ico")).body();
  assert.equal(favicon.readUInt16LE(2),1);assert.equal(favicon.readUInt16LE(4),3);
  for(const[index,size]of[16,32,48].entries()){
    const at=6+index*16,offset=favicon.readUInt32LE(at+12),length=favicon.readUInt32LE(at+8);
    await approvedPixels(favicon.subarray(offset,offset+length),`public/fix-it-shop-app/identity/favicon-${size}.png`,size);
  }
  for(const[path,size]of[["/icon.png",192],["/apple-icon.png",180]])
    await approvedPixels(await(await standalone.request.get(origin+path)).body(),`public/fix-it-shop-app/identity/icon-${size}.png`,size);
  await standalone.close();
  const blocked=await newContext();await blocked.addInitScript(()=>{Object.defineProperty(window,"localStorage",{get(){throw new DOMException("Blocked","SecurityError");}});Object.defineProperty(window,"sessionStorage",{get(){throw new DOMException("Blocked","SecurityError");}});});
  const bp=await blocked.newPage();await bp.goto(origin+base+"#card");await bp.getByLabel("What would you like to change?").fill("Synthetic unsaved only");await bp.getByRole("button",{name:"Save on this device"}).click();
  await bp.getByText("This card could not be saved. Keep this page open or try a browser that allows device storage.",{exact:true}).waitFor();await blocked.close();
  const presentation=await newContext();
  await presentation.addInitScript(()=>{
    if(location.origin==="null")return;
    localStorage.setItem("fix-it-consultation:v1",JSON.stringify({version:1,change:"Example: A little shorter at the sides.",keep:"Example: Keep some texture at the top.",questions:"Example: What should we talk through before we start?"}));
  });
  const photoPage=await presentation.newPage();await photoPage.goto(origin+base+"#show");await photoPage.locator('[data-screen="show"]:visible').waitFor();
  for(const width of [390,884]){await photoPage.setViewportSize({width,height:900});await photoPage.screenshot({path:dir+`/consultation-show-${width}.png`,fullPage:true});}
  await photoPage.setViewportSize({width:390,height:900});
  await photoPage.waitForFunction(()=>!!navigator.serviceWorker.controller);await presentation.setOffline(true);await photoPage.locator("#connection:visible").waitFor();
  await photoPage.screenshot({path:dir+"/consultation-offline-390.png",fullPage:true});
  await presentation.close();
  for(const width of [390,884]){
    const touch=await newContext({hasTouch:true,isMobile:true,viewport:{width,height:600}}),tp=await touch.newPage();activePage=tp;
    await tp.goto(origin+base+"#home");assert.ok(await tp.evaluate(()=>navigator.maxTouchPoints>0));
    for(const name of ["services","card","shop","katie","home"]){
      await tp.locator(`.app-nav a[href="#${name}"]`).tap();await tp.locator(`[data-screen="${name}"]:visible`).waitFor();
    }
    await tp.goBack();await tp.locator('[data-screen="katie"]:visible').waitFor();
    await tp.locator('.quick-book').tap();await tp.getByText("Local fixture only.",{exact:true}).waitFor();assert.equal(tp.url(),gg);
    await touch.close();
  }
  checks.push("Both manifests retain IDs/scope/start URL and serve approved PNG dimensions; emulated touch works across all five destinations, browser Back and direct booking at 390/884 short heights; physical install remains unverified");
  checks.push("Browser website preserved; legacy customer entry and both standalone manifests open compact app; blocked storage never reports a successful save");
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);assert.deepEqual(appApiRequests,[]);assert.ok(external.length>=2);assert.ok(external.every(r=>r.url===gg&&r.method==="GET"));
  await writeFile(dir+"/results.json",JSON.stringify({checks,cached,workerScope,external,writes,errors,appApiRequests,standalone:"emulated display-mode only; physical installation remains unverified",merchant:"intercepted locally; no actual booking/payment/message"},null,2));
  console.log("PASS customer app: "+checks.join("; "));
} catch(error) {
  if(activePage&&!activePage.isClosed()){await activePage.screenshot({path:dir+"/failure.png",fullPage:true}).catch(()=>{});await writeFile(dir+"/failure.json",JSON.stringify({url:activePage.url(),checks,error:String(error)},null,2));}
  throw error;
} finally {
  await browser?.close();server.kill("SIGTERM");if(server.exitCode===null)await new Promise(r=>server.once("exit",r));await writeFile(dir+"/server.log",logs);
}
