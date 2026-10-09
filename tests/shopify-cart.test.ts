import { test } from "node:test";
import assert from "node:assert/strict";
import { changeCart, publicCart, readCart } from "../lib/shopify/cart";
import { shopifyCollection } from "../lib/shopify/storefront";
import { shopifySettings, type ShopifyConfig } from "../lib/shopify/config";
const config:ShopifyConfig={domain:"test.myshopify.com",token:"synthetic",collection:"",version:"2026-07",checkout:true,checkoutHosts:["test.myshopify.com"]};
const variantId="gid://shopify/ProductVariant/1";
const product={id:"gid://shopify/Product/1",handle:"essential",title:"Essential",description:"Synthetic",requiresSellingPlan:false,featuredImage:null,variants:{pageInfo:{hasNextPage:false},nodes:[{id:variantId,title:"Standard",availableForSale:true,price:{amount:"12.00",currencyCode:"USD"}}]}};
const cart={id:"gid://shopify/Cart/test?key=SECRET",checkoutUrl:"https://test.myshopify.com/cart/c/test",totalQuantity:1,cost:{totalAmount:{amount:"12.00",currencyCode:"USD"}},lines:{pageInfo:{hasNextPage:false},nodes:[{id:"line1",quantity:1,cost:{totalAmount:{amount:"12.00",currencyCode:"USD"}},merchandise:{id:variantId,title:"Standard",availableForSale:true,product:{title:"Essential",handle:"essential"}}}]}};
test("all published products paginate, without a required collection",async()=>{
 assert.ok(shopifySettings({RESERVE_COMMERCE_PROVIDER:"shopify",SHOPIFY_STORE_DOMAIN:config.domain,SHOPIFY_STOREFRONT_ACCESS_TOKEN:"test"}).config);
 let calls=0;
 const result=await shopifyCollection(config,async(_url,init)=>{
  const {query,variables}=JSON.parse(String(init?.body));
  assert.ok(!query.includes("collection(handle"));assert.ok(!query.includes("$handle"));
  assert.equal(variables.after,calls?"page2":null);calls++;
  return Response.json({data:{products:{pageInfo:{hasNextPage:calls===1,endCursor:"page2"},nodes:[{...product,handle:calls===1?"essential":"second"}]}}});
 });
 assert.equal(result.length,2);assert.equal(calls,2);
});
test("guest cart uses Shopify prices, keeps cart secrets out of public projection and reuses existing cart",async()=>{
 let calls:string[]=[];
 const fake:typeof fetch=async(_url,init)=>{
  const {query,variables}=JSON.parse(String(init?.body));calls.push(query);
  if(query.includes("ReserveProducts"))return Response.json({data:{products:{pageInfo:{hasNextPage:false},nodes:[product]}}});
  if(query.includes("ReserveCartCreate")){assert.equal(variables.input.lines[0].merchandiseId,variantId);return Response.json({data:{cartCreate:{userErrors:[],warnings:[],cart}}});}
  if(query.includes("cartLinesAdd")){assert.equal(variables.id,cart.id);return Response.json({data:{cartLinesAdd:{userErrors:[],warnings:[],cart}}});}
  return Response.json({data:{cart}});
 };
 const created=await changeCart(config,undefined,{action:"add",variantId,quantity:1},fake);
 assert.equal(created.cost.totalAmount.amount,"12.00");assert.ok(!JSON.stringify(publicCart(created)).includes("SECRET"));
 await changeCart(config,cart.id,{action:"add",variantId,quantity:1},fake);
 assert.equal(calls.filter(q=>q.includes("cartCreate(")).length,1);
 await assert.rejects(changeCart(config,cart.id,{action:"add",variantId,quantity:1,price:"0.01"},fake));
 await assert.rejects(changeCart(config,cart.id,{action:"remove",lineId:"foreign"},fake),/no longer/);
});
test("expired carts, hostile checkout URLs, inventory and provider errors fail honestly",async()=>{
 assert.equal(await readCart(config,cart.id,async()=>Response.json({data:{cart:null}})),null);
 await assert.rejects(readCart(config,cart.id,async()=>Response.json({data:{cart:{...cart,checkoutUrl:"https://evil.invalid/pay"}}})),/Invalid checkout/);
 await assert.rejects(changeCart(config,cart.id,{action:"checkout"},async()=>Response.json({data:{cart:{...cart,lines:{...cart.lines,nodes:[{...cart.lines.nodes[0],merchandise:{...cart.lines.nodes[0].merchandise,availableForSale:false}}]}}}})),/no longer available/);
 const fake:typeof fetch=async(_url,init)=>Response.json(JSON.parse(String(init?.body)).query.includes("cartLinesRemove")?{data:{cartLinesRemove:{userErrors:[{code:"ERROR"}],warnings:[],cart:null}}}:{data:{cart}});
 await assert.rejects(changeCart(config,cart.id,{action:"remove",lineId:"line1"},fake),/could not update/);
});
