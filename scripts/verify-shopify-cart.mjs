import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
if(process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NODE_ENV==="production")throw Error("Isolated synthetic preview only");
await mkdir("artifacts/collection-commerce",{recursive:true});
await writeFile("artifacts/collection-commerce/fixture-state.json","{}");
const base="http://localhost:3015";
const server=spawn(process.execPath,["node_modules/next/dist/bin/next","dev","--webpack","--hostname","127.0.0.1","--port","3015"],{env:{...process.env,NODE_ENV:"development",RESERVE_DEV_PREVIEW:"true",APP_ORIGIN:base,RESERVE_COMMERCE_PROVIDER:"shopify",SHOPIFY_STORE_DOMAIN:"reserve-test.myshopify.com",SHOPIFY_STOREFRONT_ACCESS_TOKEN:"synthetic-local-only",SHOPIFY_COLLECTION_HANDLE:"reserve-approved",SHOPIFY_API_VERSION:"2026-07",SHOPIFY_CHECKOUT_ENABLED:"true",SHOPIFY_CHECKOUT_HOSTS:"",NODE_OPTIONS:`--require=${resolve("scripts/fixtures/shopify-storefront.cjs")}`},stdio:["ignore","pipe","pipe"]});
let log="",browser;
server.stdout.on("data",d=>log+=d);server.stderr.on("data",d=>log+=d);
try{
 await new Promise((res,rej)=>{server.stdout.on("data",d=>{if(String(d).includes("Ready in"))res();});server.on("exit",()=>rej(Error(log)));setTimeout(()=>rej(Error("Startup timeout")),30000).unref();});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||"/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage"]});
 const context=await browser.newContext(),page=await context.newPage();
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto(base+"/shop/products/synthetic-essential");
 await page.getByRole("button",{name:"Add to cart"}).click();
 await page.getByRole("link",{name:"View cart"}).click();
 await page.getByRole("heading",{name:"Synthetic Essential"}).waitFor();
 assert.ok((await context.cookies()).find(c=>c.name==="reserve_shopify_cart"&&c.httpOnly));
 await page.reload();await page.getByRole("heading",{name:"Synthetic Essential"}).waitFor();
 await page.getByLabel("Quantity").selectOption("2");
 await page.getByText("Estimated total: $48.00",{exact:true}).waitFor();
 const checkout=await context.request.post(base+"/api/shop/cart",{headers:{Origin:base},data:{action:"checkout"}});
 assert.equal(checkout.status(),200);assert.equal((await checkout.json()).url,"https://reserve-test.myshopify.com/cart/c/synthetic-local-only");
 const foreign=await context.request.post(base+"/api/shop/cart",{headers:{Origin:"https://evil.invalid"},data:{action:"checkout"}});assert.equal(foreign.status(),403);
 const tampered=await context.request.post(base+"/api/shop/cart",{headers:{Origin:base},data:{action:"add",variantId:"gid://shopify/ProductVariant/10",quantity:1,price:0}});assert.equal(tampered.status(),400);
 for(const width of [320,390,884,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));await page.screenshot({path:`artifacts/collection-commerce/cart-${width}.png`});}
 await page.getByRole("button",{name:"Remove Synthetic Essential"}).click();await page.getByText("Your cart is empty.",{exact:true}).waitFor();
 await page.goto(base+"/shop");await page.getByText("FUTURE RELEASES · CONCEPT COLLECTION · NOT LIVE INVENTORY",{exact:true}).waitFor();
 assert.deepEqual(errors,[]);
 console.log("PASS: guest Add to Cart, persistence, HttpOnly cart secret, quantity/removal, checkout URL, origin/price tampering, 320/390/884/1440 layouts. Synthetic data only; no external checkout or charges.");
}catch(e){console.error(log.slice(-3500));throw e;}finally{await browser?.close();server.kill("SIGTERM");}
