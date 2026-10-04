// Test-only transport loaded by the local browser verifier, never imported by application code.
import { readFile } from "node:fs/promises";
if (
  process.env.RESERVE_VERIFY !== "true" ||
  process.env.RESERVE_SHOPIFY_TEST_TRANSPORT !== "true" ||
  process.env.NODE_ENV === "production" ||
  !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(process.env.APP_ORIGIN || "")
)
  throw Error(
    "Synthetic Shopify transport requires an isolated local verifier.",
  );
const original = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (!String(url).startsWith("https://reserve-verify.myshopify.com/"))
    return original(url, init);
  if (String(url).includes("/oauth/"))
    return Response.json({
      access_token: "synthetic-token",
      expires_in: 86399,
    });
  const { query, variables = {} } = JSON.parse(String(init?.body || "{}"));
  const fixture = JSON.parse(
    await readFile(process.env.RESERVE_SHOPIFY_FIXTURE, "utf8"),
  );
  if (/\borders\s*\(/.test(query))
    return Response.json({
      data: {
        orders: {
          nodes: fixture.orders.map((o) => ({ id: o.id })),
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      },
    });
  if (/\border\s*\(/.test(query))
    return Response.json({
      data: {
        order: fixture.orders.find((o) => o.id === variables.id) || null,
      },
    });
  if (query.includes("inventoryLevels"))
    return Response.json({
      data: {
        location: {
          inventoryLevels: {
            nodes: [
              {
                id: "gid://shopify/InventoryLevel/1",
                quantities: [
                  { name: "available", quantity: fixture.available },
                  { name: "on_hand", quantity: fixture.available },
                  { name: "committed", quantity: 0 },
                ],
                item: {
                  sku: "SYNTHETIC-OIL",
                  tracked: true,
                  variant: {
                    title: "Synthetic oil",
                    product: {
                      title: "Legacy Reserve · verification oil",
                      vendor: "Legacy Reserve",
                    },
                  },
                },
              },
            ],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
      },
    });
  if (/\blocations\s*\(/.test(query))
    return Response.json({
      data: {
        locations: {
          nodes: [
            {
              id: "gid://shopify/Location/101",
              name: "Synthetic Eunice POS",
              isActive: true,
            },
          ],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      },
    });
  return Response.json({ errors: [{ message: "Unrecognized test query" }] });
};
