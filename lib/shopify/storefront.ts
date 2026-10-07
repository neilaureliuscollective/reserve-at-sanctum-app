import { z } from "zod";
import { BookingError } from "../booking";
import { checkoutUrl, type ShopifyConfig } from "./config";
const money = z.object({
  amount: z.string().regex(/^\d{1,9}(?:\.\d{1,6})?$/),
  currencyCode: z.literal("USD"),
});
const variant = z.object({
  id: z.string().regex(/^gid:\/\/shopify\/ProductVariant\/\d+$/),
  title: z.string().max(200),
  availableForSale: z.boolean(),
  price: money,
});
export type ShopVariant = z.infer<typeof variant>;
export type ShopProduct = {
  id: string;
  handle: string;
  name: string;
  description: string;
  image: { url: string; alt: string } | null;
  variants: ShopVariant[];
  href: string;
};
export type PreparedCheckout = {
  url: string;
  estimatedTotal: { amount: string; currencyCode: "USD" };
};
const failure = () =>
  new BookingError(
    "The live Collection could not refresh. Please try again before purchasing.",
    503,
  );
async function storefront<T>(
  config: ShopifyConfig,
  query: string,
  variables: object,
  fetcher: typeof fetch,
): Promise<T> {
  try {
    const response = await fetcher(
      `https://${config.domain}/api/${config.version}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": config.token,
        },
        body: JSON.stringify({ query, variables }),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok || !response.body) throw failure();
    const reader = response.body.getReader(),
      chunks: Uint8Array[] = [];
    let bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 512000) {
          await reader.cancel();
          throw failure();
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const buffer = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const result = JSON.parse(new TextDecoder().decode(buffer));
    if (result.errors?.length || !result.data) throw failure();
    return result.data;
  } catch {
    throw failure();
  }
}
const collectionQuery = `query ReserveCollection($handle:String!) @inContext(country:US) {
 collection(handle:$handle) { handle products(first:40) {
  pageInfo { hasNextPage } nodes { id handle title description requiresSellingPlan
   featuredImage { url altText }
   variants(first:20) { pageInfo { hasNextPage } nodes { id title availableForSale price { amount currencyCode } } }
  }
 } }
}`;
const collectionData = z.object({
  collection: z
    .object({
      handle: z.string(),
      products: z.object({
        pageInfo: z.object({ hasNextPage: z.boolean() }),
        nodes: z
          .array(
            z.object({
              id: z.string().regex(/^gid:\/\/shopify\/Product\/\d+$/),
              handle: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,199}$/),
              title: z.string().min(1).max(200),
              description: z.string().max(20000),
              requiresSellingPlan: z.boolean(),
              featuredImage: z
                .object({ url: z.string(), altText: z.string().nullable() })
                .nullable(),
              variants: z.object({
                pageInfo: z.object({ hasNextPage: z.boolean() }),
                nodes: z.array(variant).max(20),
              }),
            }),
          )
          .max(40),
      }),
    })
    .nullable(),
});
export async function shopifyCollection(
  config: ShopifyConfig,
  fetcher: typeof fetch = fetch,
): Promise<ShopProduct[]> {
  const parsed = collectionData.safeParse(
    await storefront(
      config,
      collectionQuery,
      { handle: config.collection },
      fetcher,
    ),
  );
  if (
    !parsed.success ||
    !parsed.data.collection ||
    parsed.data.collection.handle !== config.collection
  )
    throw failure();
  const collection = parsed.data.collection;
  if (
    collection.products.pageInfo.hasNextPage ||
    collection.products.nodes.some((p) => p.variants.pageInfo.hasNextPage)
  )
    throw new BookingError(
      "The approved Collection exceeds this release’s product limits. Please narrow the collection before opening purchasing.",
      503,
    );
  return collection.products.nodes
    .filter((p) => !p.requiresSellingPlan)
    .map((p) => {
      let image: ShopProduct["image"] = null;
      if (p.featuredImage) {
        try {
          const url = new URL(p.featuredImage.url);
          if (
            url.protocol === "https:" &&
            url.hostname === "cdn.shopify.com" &&
            !url.username &&
            !url.password
          )
            image = {
              url: url.href,
              alt: (p.featuredImage.altText || p.title).slice(0, 300),
            };
        } catch {
          /* No unverified image host is rendered. */
        }
      }
      return {
        id: p.id,
        handle: p.handle,
        name: p.title,
        description: p.description.slice(0, 3000),
        image,
        variants: p.variants.nodes,
        href: `/shop/products/${p.handle}`,
      };
    });
}
const cartQuery = `mutation ReserveCheckout($input:CartInput!) @inContext(country:US) {
 cartCreate(input:$input) { userErrors { code } warnings { code } cart { checkoutUrl cost { totalAmount { amount currencyCode } }
  lines(first:2) { nodes { quantity merchandise { ... on ProductVariant { id } } } }
 } }
}`;
const cartData = z.object({
  cartCreate: z.object({
    userErrors: z.array(z.unknown()),
    warnings: z.array(z.unknown()),
    cart: z
      .object({
        checkoutUrl: z.string(),
        cost: z.object({ totalAmount: money }),
        lines: z.object({
          nodes: z.array(
            z.object({
              quantity: z.number().int(),
              merchandise: z.object({ id: z.string() }),
            }),
          ),
        }),
      })
      .nullable(),
  }),
});
export async function shopifyCheckout(
  config: ShopifyConfig,
  variantId: string,
  quantity: number,
  fetcher: typeof fetch = fetch,
): Promise<PreparedCheckout> {
  if (!config.checkout)
    throw new BookingError("Purchasing is not open yet.", 503);
  const data = cartData.safeParse(
    await storefront(
      config,
      cartQuery,
      {
        input: {
          lines: [{ merchandiseId: variantId, quantity }],
          buyerIdentity: { countryCode: "US" },
        },
      },
      fetcher,
    ),
  );
  if (
    !data.success ||
    data.data.cartCreate.userErrors.length ||
    data.data.cartCreate.warnings.length ||
    !data.data.cartCreate.cart
  )
    throw failure();
  const cart = data.data.cartCreate.cart;
  if (
    cart.lines.nodes.length !== 1 ||
    cart.lines.nodes[0].quantity !== quantity ||
    cart.lines.nodes[0].merchandise.id !== variantId
  )
    throw failure();
  try {
    return {
      url: checkoutUrl(cart.checkoutUrl, config),
      estimatedTotal: cart.cost.totalAmount,
    };
  } catch {
    throw failure();
  }
}
export function moneyLabel(value: { amount: string; currencyCode: "USD" }) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: value.currencyCode,
  }).format(Number(value.amount));
}
