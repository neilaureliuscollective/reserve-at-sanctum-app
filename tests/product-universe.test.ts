import test from "node:test";
import assert from "node:assert/strict";
import { catalogEditorial, parseEditorial, productDetail, productGuidance, safeProductImage, plainPolicy } from "../lib/product-universe";
import type { ShopProduct } from "../lib/shopify/storefront";
const product: ShopProduct = { id:"gid://shopify/Product/1",handle:"essential",name:"Essential",description:"Published description",image:null,href:"/shop/products/essential",variants:[{id:"gid://shopify/ProductVariant/1",title:"50 ml",availableForSale:false,price:{amount:"24",currencyCode:"USD"}}] };
test("editorial rejects malformed or unapproved fields without inventing product claims",()=>{
 assert.equal(parseEditorial('{"ingredients":[{"name":"Mystery"}]}').ingredients.length,0);
 assert.equal(parseEditorial('{"reviews":["fake"]}').ingredients.length,0);
 assert.equal(parseEditorial('{bad').ritual.length,0);
 assert.equal(safeProductImage("https://cdn.shopify.com.evil.invalid/image","x"),null);
 assert.equal(safeProductImage("https://user:secret@cdn.shopify.com/image","x"),null);
});
test("optional product enrichment failure preserves published commerce and safe media fallback",async()=>{
 const config={domain:"test.myshopify.com",token:"synthetic",collection:"",version:"2026-07",checkout:true,checkoutHosts:[]};
 const detail=await productDetail(product,config,async()=>Response.json({errors:[{}]}));
 assert.deepEqual(detail.images,[]);
 assert.match(productGuidance(product,detail,"ingredients"),/cannot infer/);
 assert.match(productGuidance(product,detail,"price"),/\$24.00 · unavailable/);
 assert.equal(plainPolicy('<script>alert(1)</script><p>Real terms &amp; conditions</p>'),"Real terms & conditions");
});
test("flagship ritual requires matching Shopify identity and source instructions",()=>{
 assert.equal(catalogEditorial({...product,handle:"softening-beard-oil"}).ritual.length,0);
 const flagship={...product,id:"gid://shopify/Product/15552472023151",handle:"softening-beard-oil",description:"Warm a few drops between the palms and work through the beard from skin to ends. Finish with a comb or brush to shape and distribute evenly. 20 mL / 0.68 fl oz Ingredients / INCI: Verified list"};
 assert.equal(catalogEditorial(flagship).ritual.length,2);
 assert.equal(catalogEditorial(flagship).specifications[0].value,"20 mL / 0.68 fl oz");
 assert.equal(catalogEditorial({...flagship,description:"Changed supplier formulation"}).ritual.length,0);
});
test("live enrichment verifies the requested handle, filters hostile media and renders policies as text",async()=>{
 const config={domain:"test.myshopify.com",token:"synthetic",collection:"",version:"2026-07",checkout:true,checkoutHosts:[]};
 const detail=await productDetail(product,config,async(_url,init)=>{
  const request=JSON.parse(String(init?.body)); assert.equal(request.variables.handle,product.handle);
  return Response.json({data:{product:{handle:product.handle,images:{nodes:[{url:"https://evil.invalid/image",altText:"fake"},{url:"https://cdn.shopify.com/real.jpg",altText:null}]},metafield:{value:JSON.stringify({family:"skin",ritual:[{title:"Published step",instruction:"Published directions"}]})}},shop:{shippingPolicy:{body:"<p>Published shipping terms</p>"},refundPolicy:null}}});
 });
 assert.equal(detail.images.length,1);assert.equal(detail.images[0].alt,product.name);
 assert.equal(detail.editorial.family,"skin");assert.match(productGuidance(product,detail,"How to use?"),/Published directions/);
 assert.deepEqual(detail.policies,[{label:"Shipping",text:"Published shipping terms"}]);
});
