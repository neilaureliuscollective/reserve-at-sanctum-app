import { z } from "zod";
import { BookingError } from "../booking";
import { checkoutUrl, type ShopifyConfig } from "./config";
import { storefront, shopifyCollection } from "./storefront";
const money = z.object({ amount: z.string().regex(/^\d{1,9}(?:\.\d{1,6})?$/), currencyCode: z.literal("USD") });
const cartSchema = z.object({
  id: z.string().min(1).max(3000), checkoutUrl: z.string(), totalQuantity: z.number().int().nonnegative(),
  cost: z.object({ totalAmount: money }),
  lines: z.object({ pageInfo: z.object({ hasNextPage: z.boolean() }), nodes: z.array(z.object({
    id: z.string(), quantity: z.number().int().positive(), cost: z.object({ totalAmount: money }),
    merchandise: z.object({ id: z.string(), title: z.string(), availableForSale: z.boolean(), product: z.object({ title: z.string(), handle: z.string() }) }),
  })).max(100) }),
});
const fields = `id checkoutUrl totalQuantity cost { totalAmount { amount currencyCode } }
 lines(first:100) { pageInfo { hasNextPage } nodes { id quantity cost { totalAmount { amount currencyCode } }
 merchandise { ... on ProductVariant { id title availableForSale product { title handle } } } } }`;
export type StoreCart = z.infer<typeof cartSchema>;
export type PublicCart = Omit<StoreCart, "id" | "checkoutUrl">;
export const cartAction = z.discriminatedUnion("action", [
 z.object({ action:z.literal("add"), variantId:z.string().regex(/^gid:\/\/shopify\/ProductVariant\/\d+$/), quantity:z.number().int().min(1).max(5) }).strict(),
 z.object({ action:z.literal("update"), lineId:z.string().min(1).max(1000), quantity:z.number().int().min(1).max(5) }).strict(),
 z.object({ action:z.literal("remove"), lineId:z.string().min(1).max(1000) }).strict(),
 z.object({ action:z.literal("checkout") }).strict(),
]);
export function publicCart(cart: StoreCart): PublicCart {
 return { totalQuantity:cart.totalQuantity, cost:cart.cost, lines:cart.lines };
}
function parseCart(raw: unknown, config: ShopifyConfig): StoreCart {
 const parsed = cartSchema.safeParse(raw);
 if (!parsed.success || parsed.data.lines.pageInfo.hasNextPage) throw new BookingError("Your cart could not refresh. Please try again.",503);
 checkoutUrl(parsed.data.checkoutUrl,config);
 return parsed.data;
}
export async function readCart(config: ShopifyConfig, id: string, fetcher: typeof fetch = fetch) {
 const data = await storefront<{cart:unknown}>(config,`query ReserveCart($id:ID!) @inContext(country:US) { cart(id:$id) { ${fields} } }`,{id},fetcher);
 return data.cart === null ? null : parseCart(data.cart,config);
}
export async function changeCart(config: ShopifyConfig, id: string | undefined, input: unknown, fetcher: typeof fetch = fetch) {
 if (!config.checkout) throw new BookingError("Purchasing is not open yet.",503);
 const action = cartAction.parse(input);
 const existing = id ? await readCart(config,id,fetcher) : null;
 if (action.action === "checkout") {
  if (!existing?.totalQuantity) throw new BookingError("Your cart is empty.",409);
  if (existing.lines.nodes.some(l=>!l.merchandise.availableForSale)) throw new BookingError("A cart item is no longer available. Please remove it before checkout.",409);
  return existing;
 }
 if (action.action === "add") {
  const products = await shopifyCollection(config,fetcher);
  if (!products.some(p=>p.variants.some(v=>v.id===action.variantId && v.availableForSale))) throw new BookingError("This product option is no longer available.",409);
  const count = existing?.lines.nodes.find(l=>l.merchandise.id===action.variantId)?.quantity || 0;
  if (count + action.quantity > 5) throw new BookingError("You can add up to five of each option.",409);
  if (existing && existing.lines.nodes.length >= 100 && !count) throw new BookingError("Your cart is full. Please check out first.",409);
 } else if (!existing?.lines.nodes.some(l=>l.id===action.lineId)) throw new BookingError("This item is no longer in your cart.",409);
 let operation: string, query: string, variables: object;
 if (!existing) {
  if (action.action !== "add") throw new BookingError("Your cart has expired. Please add your products again.",409);
  operation="cartCreate";
  query=`mutation ReserveCartCreate($input:CartInput!) @inContext(country:US) { cartCreate(input:$input) { userErrors { code } warnings { code } cart { ${fields} } } }`;
  variables={input:{lines:[{merchandiseId:action.variantId,quantity:action.quantity}],buyerIdentity:{countryCode:"US"}}};
 } else {
  operation=action.action==="add"?"cartLinesAdd":action.action==="update"?"cartLinesUpdate":"cartLinesRemove";
  const type=action.action==="add"?"[CartLineInput!]!":action.action==="update"?"[CartLineUpdateInput!]!":"[ID!]!";
  const argument=action.action==="remove"?"lineIds":"lines";
  const lines=action.action==="add"?[{merchandiseId:action.variantId,quantity:action.quantity}]:action.action==="update"?[{id:action.lineId,quantity:action.quantity}]:[action.lineId];
  query=`mutation ReserveCartChange($id:ID!,$lines:${type}) @inContext(country:US) { ${operation}(cartId:$id,${argument}:$lines) { userErrors { code } warnings { code } cart { ${fields} } } }`;
  variables={id:existing.id,lines};
 }
 const data=await storefront<Record<string,{userErrors:unknown[];warnings:unknown[];cart:unknown}>>(config,query,variables,fetcher);
 const result=data[operation];
 if (!result || !Array.isArray(result.userErrors) || result.userErrors.length) throw new BookingError("Shopify could not update your cart. Please refresh and try again.",409);
 // Warnings can indicate inventory adjustments. Return Shopify's actual quantities and prices.
 return parseCart(result.cart,config);
}
