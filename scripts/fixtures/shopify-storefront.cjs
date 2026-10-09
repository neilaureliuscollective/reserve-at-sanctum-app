// Verification transport only. Not imported by any application module.
if (
  process.env.NODE_ENV === "production" ||
  process.env.RESERVE_DEV_PREVIEW !== "true" ||
  process.env.SHOPIFY_STORE_DOMAIN !== "reserve-test.myshopify.com" ||
  process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN !== "synthetic-local-only"
) {
  throw Error(
    "The Shopify fixture is restricted to isolated synthetic verification.",
  );
}
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const originalFetch = globalThis.fetch;
let savedCart = null;
globalThis.fetch = async (input, init) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  if (url !== "https://reserve-test.myshopify.com/api/2026-07/graphql.json")
    return originalFetch(input, init);
  let state = {};
  try {
    state = JSON.parse(
      readFileSync(
        resolve("artifacts/collection-commerce/fixture-state.json"),
        "utf8",
      ),
    );
  } catch {}
  if (state.fail)
    return Response.json({
      errors: [{ message: "SYNTHETIC_PROVIDER_FAILURE" }],
    });
  const request = JSON.parse(init?.body || (await input.clone().text()));
  if (request.query.includes("ReserveCart")) {
    let operation = "cart";
    if (request.query.includes("cartCreate")) {
      operation = "cartCreate";
      savedCart = { id:"gid://shopify/Cart/local?key=synthetic-secret", checkoutUrl:"https://reserve-test.myshopify.com/cart/c/synthetic-local-only", lines:{pageInfo:{hasNextPage:false},nodes:[]} };
    } else if (request.query.includes("cartLinesAdd")) operation="cartLinesAdd";
    else if (request.query.includes("cartLinesUpdate")) operation="cartLinesUpdate";
    else if (request.query.includes("cartLinesRemove")) operation="cartLinesRemove";
    if(operation==="cartCreate" || operation==="cartLinesAdd") {
      const line=operation==="cartCreate"?request.variables.input.lines[0]:request.variables.lines[0];
      const existing=savedCart.lines.nodes.find(l=>l.merchandise.id===line.merchandiseId);
      if(existing) existing.quantity+=line.quantity;
      else savedCart.lines.nodes.push({id:"line-"+savedCart.lines.nodes.length,quantity:line.quantity,merchandise:{id:line.merchandiseId,title:"50 ml",availableForSale:true,product:{title:"Synthetic Essential",handle:"synthetic-essential"}}});
    }
    if(operation==="cartLinesUpdate") {const line=request.variables.lines[0]; savedCart.lines.nodes.find(l=>l.id===line.id).quantity=line.quantity;}
    if(operation==="cartLinesRemove") savedCart.lines.nodes=savedCart.lines.nodes.filter(l=>!request.variables.lines.includes(l.id));
    if(savedCart) {
      savedCart.totalQuantity=savedCart.lines.nodes.reduce((n,l)=>n+l.quantity,0);
      savedCart.cost={totalAmount:{amount:String(24*savedCart.totalQuantity),currencyCode:"USD"}};
      for(const l of savedCart.lines.nodes) l.cost={totalAmount:{amount:String(24*l.quantity),currencyCode:"USD"}};
    }
    return Response.json({data:{[operation]:operation==="cart"?savedCart:{userErrors:[],warnings:[],cart:savedCart}}});
  }
  if (request.query.includes("cartCreate")) {
    const line = request.variables.input.lines[0];
    return Response.json({
      data: {
        cartCreate: {
          userErrors: [],
          warnings: [],
          cart: {
            checkoutUrl:
              "https://reserve-test.myshopify.com/cart/c/synthetic-local-only",
            cost: {
              totalAmount: {
                amount: String(24 * line.quantity),
                currencyCode: "USD",
              },
            },
            lines: {
              nodes: [
                {
                  quantity: line.quantity,
                  merchandise: { id: line.merchandiseId },
                },
              ],
            },
          },
        },
      },
    });
  }
  return Response.json({
    data: {
      collection: {
        handle: "reserve-approved",
        products: {
          pageInfo: { hasNextPage: false },
          nodes: [
            {
              id: "gid://shopify/Product/1",
              handle: "synthetic-essential",
              title: "Synthetic Essential",
              description:
                "Local verification product. Never published to Shopify; no real purchase.",
              requiresSellingPlan: false,
              featuredImage: null,
              variants: {
                pageInfo: { hasNextPage: false },
                nodes: [
                  {
                    id: "gid://shopify/ProductVariant/10",
                    title: "50 ml",
                    availableForSale: true,
                    price: { amount: "24.00", currencyCode: "USD" },
                  },
                  {
                    id: "gid://shopify/ProductVariant/11",
                    title: "100 ml",
                    availableForSale: false,
                    price: { amount: "40.00", currencyCode: "USD" },
                  },
                ],
              },
            },
          ],
        },
      },
    },
  });
};
