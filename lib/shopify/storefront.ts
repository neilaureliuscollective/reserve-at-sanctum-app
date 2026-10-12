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
  productType?: string;
  category?: string;
  attributes?: Partial<Record<"ingredients" | "benefits" | "concerns" | "finish" | "hold", string>>;
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
export async function storefront<T>(
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
const intelligenceFields = `productType category { name }
 metafields(identifiers:[{namespace:"reserve",key:"ingredients"},{namespace:"reserve",key:"benefits"},{namespace:"reserve",key:"concerns"},{namespace:"reserve",key:"finish"},{namespace:"reserve",key:"hold"}]) { key value type }`;
const collectionQuery = `query ReserveCollection($handle:String!,$after:String) @inContext(country:US) {
 collection(handle:$handle) { handle products(first:40,after:$after) {
  pageInfo { hasNextPage endCursor } nodes { id handle title description requiresSellingPlan ${intelligenceFields}
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
        pageInfo: z.object({ hasNextPage: z.boolean(), endCursor: z.string().nullable().optional() }),
        nodes: z
          .array(
            z.object({
              id: z.string().regex(/^gid:\/\/shopify\/Product\/\d+$/),
              handle: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,199}$/),
              title: z.string().min(1).max(200),
              description: z.string().max(20000),
              requiresSellingPlan: z.boolean(),
              productType: z.string().max(300).optional(),
              category: z.object({ name: z.string().max(300) }).nullable().optional(),
              metafields: z.array(z.object({ key: z.string(), value: z.string().max(6000), type: z.string() }).nullable()).max(5).optional(),
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
  const products: NonNullable<z.infer<typeof collectionData>["collection"]>["products"]["nodes"] = [];
  let after: string | null = null;
  const cursors = new Set<string>();
  for (let page = 0; ; page++) {
    if (page >= 100) throw failure();
    const query = config.collection ? collectionQuery : `query ReserveProducts($after:String) @inContext(country:US) {
      products(first:40,after:$after) { pageInfo { hasNextPage endCursor } nodes {
        id handle title description requiresSellingPlan ${intelligenceFields} featuredImage { url altText }
        variants(first:20) { pageInfo { hasNextPage } nodes { id title availableForSale price { amount currencyCode } } }
      } }
    }`;
    const raw = await storefront<Record<string, unknown>>(config, query,
      config.collection ? { handle: config.collection, after } : { after }, fetcher);
    const parsed = collectionData.safeParse(config.collection ? raw : {
      collection: { handle: "", products: raw.products },
    });
    if (!parsed.success || !parsed.data.collection || parsed.data.collection.handle !== config.collection) throw failure();
    const connection = parsed.data.collection.products;
    if (connection.nodes.some(p => p.variants.pageInfo.hasNextPage))
      throw new BookingError("A product exceeds this release’s variant limits. Please review its options before purchasing.", 503);
    products.push(...connection.nodes);
    if (!connection.pageInfo.hasNextPage) break;
    const cursor = connection.pageInfo.endCursor;
    if (!cursor || cursors.has(cursor)) throw new BookingError("The Collection exceeds valid pagination limits. Please try again.", 503);
    cursors.add(cursor);
    after = cursor;
  }
  return products
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
        productType: p.productType ?? "",
        category: p.category?.name ?? "",
        attributes: Object.fromEntries((p.metafields ?? []).flatMap(field => {
          if (!field || !["ingredients", "benefits", "concerns", "finish", "hold"].includes(field.key)) return [];
          if (["single_line_text_field", "multi_line_text_field"].includes(field.type)) return [[field.key, field.value.slice(0, 2000)]];
          if (field.type === "list.single_line_text_field") {
            try {
              const values = z.array(z.string().max(500)).max(30).parse(JSON.parse(field.value));
              return [[field.key, values.join(", ").slice(0, 2000)]];
            } catch { /* Unsupported attributes never become product facts. */ }
          }
          return [];
        })),
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
