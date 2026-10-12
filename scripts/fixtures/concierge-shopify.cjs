// Synthetic verification only; inherits the existing fixture's strict preview guards.
require('./shopify-storefront.cjs');
const baseFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (url !== 'https://reserve-test.myshopify.com/api/2026-07/graphql.json') return baseFetch(input, init);
  const request = JSON.parse(init?.body || await input.clone().text());
  const response = await baseFetch(input, init);
  if (request.query.includes('cart')) return response;
  const raw = await response.json();
  const nodes = raw.data?.collection?.products?.nodes;
  if (!nodes) return Response.json(raw);
  nodes[0].description = 'Synthetic beard conditioner. Conditions and softens coarse beard hair. Verification only; no real purchase.';
  nodes[0].productType = 'Beard care';
  nodes[0].category = {name:'Beard care'};
  nodes[0].metafields = [{key:'ingredients',type:'single_line_text_field',value:'Synthetic ingredient; verification only'}];
  for (const [id,name,description,type,available] of [
    [2,'Synthetic Matte Clay','Synthetic hair styling: matte finish and high hold.','Hair styling',true],
    [3,'Synthetic Shine Pomade','Synthetic hair styling: shine and light hold.','Hair styling',true],
    [4,'Synthetic Unavailable Balm','Conditions and softens coarse beard hair.','Beard care',false],
  ]) nodes.push({...nodes[0],id:`gid://shopify/Product/${id}`,handle:name.toLowerCase().replaceAll(' ','-'),title:name,description,productType:type,category:{name:type},variants:{pageInfo:{hasNextPage:false},nodes:[{id:`gid://shopify/ProductVariant/${id*10}`,title:'Standard',availableForSale:available,price:{amount:'24.00',currencyCode:'USD'}}]}});
  return Response.json(raw);
};
