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
