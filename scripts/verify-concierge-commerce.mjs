import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
if(process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NODE_ENV==='production') throw Error('Isolated synthetic preview only');
const base='http://localhost:3016';
await mkdir('artifacts/collection-commerce',{recursive:true});
await mkdir('artifacts/concierge-commerce',{recursive:true});
await writeFile('artifacts/collection-commerce/fixture-state.json','{}');
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port','3016'],{
 env:{...process.env,NODE_ENV:'development',DATABASE_URL:'',NEXT_PUBLIC_SUPABASE_URL:'',RESERVE_DEV_PREVIEW:'true',APP_ORIGIN:base,RESERVE_CONCIERGE_MODEL:'',RESERVE_CONCIERGE_SEMANTIC_ENABLED:'false',RESERVE_COMMERCE_PROVIDER:'shopify',SHOPIFY_STORE_DOMAIN:'reserve-test.myshopify.com',SHOPIFY_STOREFRONT_ACCESS_TOKEN:'synthetic-local-only',SHOPIFY_COLLECTION_HANDLE:'reserve-approved',SHOPIFY_API_VERSION:'2026-07',SHOPIFY_CHECKOUT_ENABLED:'true',SHOPIFY_CHECKOUT_HOSTS:'',NODE_OPTIONS:`--require=${resolve('scripts/fixtures/concierge-shopify.cjs')}`},stdio:['ignore','pipe','pipe']});
let log='',browser;
server.stdout.on('data',d=>log+=d);server.stderr.on('data',d=>log+=d);
try {
 await new Promise((res,rej)=>{server.stdout.on('data',d=>{if(String(d).includes('Ready in'))res();});server.on('exit',()=>rej(Error(log)));setTimeout(()=>rej(Error('Startup timeout; a local network socket is required')),30000).unref();});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 const customer=await browser.newContext(),staff=await browser.newContext(),guest=await browser.newContext();
 const post=(ctx,path,data,origin=base)=>ctx.request.post(base+path,{headers:{Origin:origin},data});
 assert.equal((await post(guest,'/api/aethelios/member',{message:'Soften my beard'})).status(),401);
 assert.equal((await post(customer,'/api/auth',{action:'preview',identity:'preview-client'})).status(),200);
 assert.equal((await post(staff,'/api/auth',{action:'preview',identity:'preview-katie'})).status(),200);
 assert.equal((await post(staff,'/api/aethelios/member',{message:'Shop products'})).status(),403);
 assert.equal((await post(customer,'/api/aethelios/member',{message:'Shop products'},'https://evil.invalid')).status(),403);
 assert.equal((await post(customer,'/api/aethelios/member',{message:'Shop products',userId:'preview-other'})).status(),400);
 const page=await customer.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/aethelios');
 await page.getByRole('button',{name:'My beard is dry. What would help?'}).click();
 await page.getByText('Absolutely. Are you mainly dealing with coarse beard hair, dry skin underneath, or a combination of both?').waitFor();
 await page.getByRole('button',{name:'Mostly coarse beard hair'}).click();
 await page.getByRole('heading',{name:'Synthetic Essential',exact:true}).waitFor();
 for(const width of [320,360,390,768,884,1440]) {
  await page.setViewportSize({width,height:900});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`Overflow at ${width}`);
  const action=page.getByRole('button',{name:'Add Synthetic Essential to cart'});
  const box=await action.boundingBox();assert.ok(box.height>=44,`Touch target at ${width}`);
  await page.screenshot({path:`artifacts/concierge-commerce/recommendation-${width}.png`,fullPage:true});
 }
 await page.getByLabel('Product option').selectOption('gid://shopify/ProductVariant/11');
 assert.ok(await page.getByRole('button',{name:'Add Synthetic Essential to cart'}).isDisabled());
 await page.getByLabel('Product option').selectOption('gid://shopify/ProductVariant/10');
 await page.getByRole('button',{name:'Add Synthetic Essential to cart'}).click();
 await page.getByRole('link',{name:'Review cart & checkout'}).click();
 await page.getByText('Estimated total: $24.00',{exact:true}).waitFor();
 assert.ok((await customer.cookies()).find(c=>c.name==='reserve_shopify_cart'&&c.httpOnly));
 await page.route('https://reserve-test.myshopify.com/**',route=>route.fulfill({contentType:'text/html',body:'<h1>Synthetic checkout handoff</h1><p>No order placed.</p>'}));
 await page.getByRole('button',{name:'Continue to Shopify checkout'}).click();
 await page.getByRole('heading',{name:'Synthetic checkout handoff'}).waitFor();
 // Independent account avoids carrying shopping request limits into booking tests.
 const second=await browser.newContext();await post(second,'/api/auth',{action:'preview',identity:'preview-other'});
 const booking=await post(second,'/api/aethelios/member',{message:'Can I book with Katie next Thursday?'});assert.equal(booking.status(),200);const b=await booking.json();assert.ok(b.booking.services.every(s=>s.label.includes('Katie')));assert.ok(b.booking.date);
 const comparison=await post(second,'/api/aethelios/member',{message:'Compare Synthetic Matte Clay and Synthetic Shine Pomade'});assert.equal(comparison.status(),200);assert.equal((await comparison.json()).shopping.products.length,2);
 const unavailable=await post(second,'/api/aethelios/member',{message:'Is Synthetic Unavailable Balm available?'});assert.equal(unavailable.status(),200);assert.equal((await unavailable.json()).shopping.products[0].product.variants[0].availableForSale,false);
 const brand=await post(second,'/api/aethelios/member',{message:'What is Legacy Reserve?'});assert.match((await brand.json()).text,/optional physical destination/);
 const tampered=await post(customer,'/api/shop/cart',{action:'add',variantId:'gid://shopify/ProductVariant/10',quantity:1,price:0,source:'aethelios'});assert.equal(tampered.status(),400);
 assert.deepEqual(errors,[]);
 console.log('PASS: clarification, real component cards, variant stock, explicit cart selection, synthetic checkout handoff, comparison, booking discovery, brand answers, account/origin validation, 320/360/390/768/884/1440 layouts. No real orders.');
} catch(e) {console.error(log.slice(-2500));throw e;}
finally {await browser?.close();server.kill('SIGTERM');}
