import { BookingError } from "../../lib/booking";
export const SHOPIFY_VERSION = "2026-07";
export const domainPattern = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
export const orderPattern = /^gid:\/\/shopify\/Order\/\d+$/;
export const locationPattern = /^gid:\/\/shopify\/Location\/\d+$/;
export type Money = { shopMoney: { amount: string; currencyCode: string } };
export type RemoteOrder = {
  id: string;
  name: string;
  updatedAt: string;
  processedAt: string;
  sourceName: string | null;
  retailLocation: { id: string } | null;
  test: boolean;
  cancelledAt: string | null;
  displayFinancialStatus: string;
  totalPriceSet: Money;
  totalReceivedSet: Money;
  totalRefundedSet: Money;
  lineItems: {
    nodes: { id: string; name: string; quantity: number }[];
    pageInfo: { hasNextPage: boolean };
  };
};
export type Page<T> = {
  nodes: T[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};
export type ShopLocation = { id: string; name: string; isActive: boolean };
export type Stock = {
  id: string;
  quantities: { name: string; quantity: number }[];
  item: {
    sku: string | null;
    tracked: boolean;
    variant: {
      title: string;
      product: { title: string; vendor: string };
    } | null;
  };
};
export interface ShopifyClient {
  locations(): Promise<Page<ShopLocation>>;
  order(id: string): Promise<RemoteOrder>;
  recent(
    location: string,
    after?: string,
    window?: { from: string; until: string },
  ): Promise<Page<{ id: string }>>;
  inventory(location: string, after?: string): Promise<Page<Stock>>;
}
export function shopDomain() {
  const domain = process.env.SHOPIFY_SHOP_DOMAIN || "";
  if (!domainPattern.test(domain))
    throw new BookingError(
      "Configure the Shopify .myshopify.com store domain.",
      503,
    );
  return domain;
}
export function shopifyConfigured() {
  return (
    domainPattern.test(process.env.SHOPIFY_SHOP_DOMAIN || "") &&
    Boolean(process.env.SHOPIFY_CLIENT_ID && process.env.SHOPIFY_CLIENT_SECRET)
  );
}
let cached: { key: string; token: string; until: number } | undefined;
let flight: { key: string; promise: Promise<string> } | undefined;
async function token() {
  const domain = shopDomain(),
    clientId = process.env.SHOPIFY_CLIENT_ID,
    secret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientId || !secret)
    throw new BookingError("Shopify app installation is not configured.", 503);
  const key = `${domain}:${clientId}:${secret}`;
  if (cached?.key === key && cached.until > Date.now()) return cached.token;
  if (flight?.key === key) return flight.promise;
  const promise = (async () => {
    const response = await fetch(`https://${domain}/admin/oauth/access_token`, {
      method: "POST",
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: secret,
      }),
    });
    if (!response.ok)
      throw new BookingError(
        "Shopify authorization failed. Check app installation and organization ownership.",
        503,
      );
    const data = await response.json();
    if (
      typeof data.access_token !== "string" ||
      !Number.isFinite(data.expires_in) ||
      data.expires_in < 120
    )
      throw new BookingError("Shopify returned an invalid token.", 503);
    cached = {
      key,
      token: data.access_token,
      until: Date.now() + (data.expires_in - 60) * 1000,
    };
    return data.access_token as string;
  })();
  flight = { key, promise };
  try {
    return await promise;
  } finally {
    if (flight?.promise === promise) flight = undefined;
  }
}
export async function graphql<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(
    `https://${shopDomain()}/admin/api/${SHOPIFY_VERSION}/graphql.json`,
    {
      method: "POST",
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": await token(),
      },
      body: JSON.stringify({ query, variables }),
    },
  );
  if (!response.ok) {
    if (response.status === 401) cached = undefined;
    throw new BookingError(
      "Shopify is unavailable. No payment or stock change was made by Reserve.",
      503,
    );
  }
  const data = await response.json();
  if (data.errors?.length || !data.data)
    throw new BookingError(
      "Shopify query failed. Check app permissions and retry.",
      503,
    );
  return data.data;
}
const fields = `id name updatedAt processedAt sourceName retailLocation { id } test cancelledAt displayFinancialStatus totalPriceSet { shopMoney { amount currencyCode } } totalReceivedSet { shopMoney { amount currencyCode } } totalRefundedSet { shopMoney { amount currencyCode } } lineItems(first:100) { nodes { id name quantity } pageInfo { hasNextPage } }`;
export const shopifyClient: ShopifyClient = {
  async locations() {
    return (
      await graphql<{ locations: Page<ShopLocation> }>(`
        query {
          locations(first: 100) {
            nodes {
              id
              name
              isActive
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `)
    ).locations;
  },
  async order(id) {
    if (!orderPattern.test(id))
      throw new BookingError("Enter a valid Shopify order ID.", 400);
    const data = await graphql<{ order: RemoteOrder | null }>(
      `query($id:ID!) { order(id:$id) { ${fields} } }`,
      { id },
    );
    if (!data.order)
      throw new BookingError(
        "Shopify order not found or outside permitted history.",
        404,
      );
    return data.order;
  },
  async recent(location, after, window) {
    if (!locationPattern.test(location))
      throw new BookingError("Invalid Shopify location.", 400);
    return (
      await graphql<{ orders: Page<{ id: string }> }>(
        `
          query ($q: String!, $after: String) {
            orders(
              first: 10
              after: $after
              query: $q
              sortKey: UPDATED_AT
              reverse: true
            ) {
              nodes {
                id
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        `,
        {
          q: `source_name:pos location_id:${location.split("/").pop()}${window ? ` updated_at:>=${window.from} updated_at:<=${window.until}` : ""}`,
          after: after || null,
        },
      )
    ).orders;
  },
  async inventory(location, after) {
    const data = await graphql<{
      location: { inventoryLevels: Page<Stock> } | null;
    }>(
      `
        query ($id: ID!, $after: String) {
          location(id: $id) {
            inventoryLevels(first: 50, after: $after) {
              nodes {
                id
                quantities(names: ["available", "on_hand", "committed"]) {
                  name
                  quantity
                }
                item {
                  sku
                  tracked
                  variant {
                    title
                    product {
                      title
                      vendor
                    }
                  }
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }
      `,
      { id: location, after: after || null },
    );
    if (!data.location)
      throw new BookingError("Shopify location is unavailable.", 503);
    return data.location.inventoryLevels;
  },
};
/** Decimal USD strings to integer cents, without floating-point rounding. */
export function cents(value: Money) {
  const { amount, currencyCode } = value.shopMoney;
  if (currencyCode !== "USD" || !/^\d+(\.\d{1,2})?$/.test(amount))
    throw new BookingError(
      "Only exact USD commerce values are commissioned.",
      409,
    );
  const [whole, fraction = ""] = amount.split(".");
  const result = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (result > 1000000000n)
    throw new BookingError("Commerce amount requires manual review.", 409);
  return Number(result);
}
