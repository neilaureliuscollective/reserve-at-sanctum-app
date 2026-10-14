import { z } from "zod";
import { storefront, type ShopProduct, moneyLabel } from "./shopify/storefront";
import { shopifySettings, type ShopifyConfig } from "./shopify/config";

const text = z.string().trim().min(1).max(4000);
export const editorialSchema = z.object({
  family: z.enum(["hair", "beard", "skin", "body", "wellness", "essential"]).default("essential"),
  introduction: text.optional(),
  ingredients: z.array(z.object({ name: text, explanation: text })).max(20).default([]),
  ritual: z.array(z.object({ title: text, instruction: text })).max(8).default([]),
  specifications: z.array(z.object({ label: text, value: text })).max(20).default([]),
  complementaryHandles: z.array(z.string().regex(/^[a-z0-9][a-z0-9_-]{0,199}$/)).max(6).default([]),
}).strict();
export type ProductEditorial = z.infer<typeof editorialSchema>;
export type ProductImage = { url: string; alt: string };
export type ProductDetail = { images: ProductImage[]; editorial: ProductEditorial; policies: { label: string; text: string }[] };
export function safeProductImage(url: string, alt: string): ProductImage | null {
  try {
    const value = new URL(url);
    if (value.protocol !== "https:" || value.hostname !== "cdn.shopify.com" || value.username || value.password || value.port) return null;
    return { url: value.href, alt: alt.slice(0, 300) };
  } catch { return null; }
}
export function parseEditorial(value?: string | null): ProductEditorial {
  try {
    const parsed = editorialSchema.safeParse(JSON.parse(value || "{}"));
    if (parsed.success) return parsed.data;
  } catch { /* Invalid editorial never disables commerce. */ }
  return editorialSchema.parse({});
}
const detailSchema = z.object({
  product: z.object({
    handle: z.string(),
    images: z.object({ nodes: z.array(z.object({ url: z.string(), altText: z.string().nullable() })).max(12) }),
    metafield: z.object({ value: z.string().max(40000) }).nullable(),
  }).nullable(),
  shop: z.object({
    shippingPolicy: z.object({ body: z.string().max(50000) }).nullable(),
    refundPolicy: z.object({ body: z.string().max(50000) }).nullable(),
  }),
});
// Policy HTML is displayed as plain text; supplier HTML never enters the DOM.
export function plainPolicy(body: string) {
  return body.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n").replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .trim();
}
/** Flagship editorial is gated by the exact published Shopify identity and source text.
 * It never changes price, inventory, name, or the supplier description. */
export function catalogEditorial(product: ShopProduct): ProductEditorial {
  const e = parseEditorial();
  if (product.id !== "gid://shopify/Product/15552472023151" || product.handle !== "softening-beard-oil") return e;
  const first = "Warm a few drops between the palms and work through the beard from skin to ends.";
  const second = "Finish with a comb or brush to shape and distribute evenly.";
  if (!product.description.includes(first) || !product.description.includes(second)) return e;
  const inci = product.description.split("Ingredients / INCI: ")[1];
  return { ...e, family: "beard", introduction: "The everyday standard for a softer, better-kept beard.",
    ritual: [{ title: "Warm & distribute", instruction: first }, { title: "Shape & finish", instruction: second }],
    ingredients: inci ? [{ name: "Published INCI ingredient list", explanation: inci }] : [],
    specifications: product.description.includes("20 mL / 0.68 fl oz") ? [{ label: "Volume", value: "20 mL / 0.68 fl oz" }] : [] };
}
export async function productDetail(product: ShopProduct, config: ShopifyConfig | null = shopifySettings().config, fetcher: typeof fetch = fetch): Promise<ProductDetail> {
  const fallback: ProductDetail = { images: product.image ? [product.image] : [], editorial: catalogEditorial(product), policies: [] };
  if (!config) return fallback;
  try {
    const data = detailSchema.parse(await storefront(config, `query ReserveProductUniverse($handle:String!) {
      product(handle:$handle) { handle images(first:12) { nodes { url altText } }
        metafield(namespace:"legacy_reserve",key:"product_universe") { value } }
      shop { shippingPolicy { body } refundPolicy { body } }
    }`, { handle: product.handle }, fetcher));
    if (data.product?.handle !== product.handle) return fallback;
    const images = data.product.images.nodes.map(i => safeProductImage(i.url, i.altText || product.name)).filter((i): i is ProductImage => Boolean(i));
    return {
      images: images.length ? images : fallback.images,
      editorial: data.product.metafield?.value ? parseEditorial(data.product.metafield.value) : catalogEditorial(product),
      policies: [{ label: "Shipping", body: data.shop.shippingPolicy?.body }, { label: "Returns", body: data.shop.refundPolicy?.body }]
        .filter(p => p.body).map(p => ({ label: p.label, text: plainPolicy(p.body!) })),
    };
  } catch { return fallback; }
}
export function productGuidance(product: ShopProduct, detail: ProductDetail, topic: string) {
  const options = product.variants.map(v => `${v.title}: ${moneyLabel(v.price)} · ${v.availableForSale ? "available" : "unavailable"}`).join("; ");
  if (/ingredient|formul|contain/i.test(topic)) return detail.editorial.ingredients.length
    ? detail.editorial.ingredients.map(i => `${i.name}: ${i.explanation}`).join("\n\n")
    : "A verified ingredient explanation has not been published for this product. Review its published description and packaging; I cannot infer its formulation or benefits.";
  if (/use|ritual|routine/i.test(topic)) return detail.editorial.ritual.length
    ? detail.editorial.ritual.map((s, n) => `${n + 1}. ${s.title}: ${s.instruction}`).join("\n\n")
    : "Verified usage instructions have not been published for this product. Follow the directions on its packaging; I cannot invent a usage routine.";
  if (/price|stock|avail|buy|cart/i.test(topic)) return `${product.name}\n${options}\nReview your selection on the product page before adding it to your cart. Shipping, tax and final totals are confirmed by Shopify. Member pricing and subscriptions are not active.`;
  return `${product.name}\n\n${product.description || "A detailed description has not been published."}\n\n${options}\n\nI can explain published ingredients, usage instructions, and current options. Unpublished claims and personal suitability cannot be verified.`;
}
