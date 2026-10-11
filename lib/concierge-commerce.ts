import { z } from "zod";
import type { CollectionSnapshot } from "./collection";
import type { ShopProduct } from "./shopify/storefront";

/** Intent slots describe the customer's request, never product facts or authority. */
export const shoppingNeedSchema = z.object({
  shopping: z.boolean(),
  category: z.enum(["beard", "hair", "skin"]).nullable(),
  concern: z.enum(["coarse", "dry_skin", "conditioning", "hydration", "both"]).nullable(),
  finish: z.enum(["matte", "shine"]).nullable(),
  hold: z.enum(["high", "light"]).nullable(),
  gift: z.boolean(),
}).strict();
export type ShoppingNeed = z.infer<typeof shoppingNeedSchema>;
export type ShoppingContext = { messages?: string[]; productHandle?: string };
export type ProductRecommendation = { product: ShopProduct; evidence: string[] };
export type ShoppingReply = {
  text: string;
  links: { label: string; href: string }[];
  mode: "verified";
  shopping: { products: ProductRecommendation[]; checkout: boolean; question?: string; suggestions: string[] };
};
const empty: ShoppingNeed = { shopping: false, category: null, concern: null, finish: null, hold: null, gift: false };
const categoryPatterns = { beard: /\bbeard|whisker|facial hair/i, hair: /\bhair|styl(?:ing|e)|pomade|shampoo|conditioner|\bclay\b(?! mask)/i, skin: /\bskin|moisturi[sz]|complexion|\bface\b|eye cream|facial (?!hair)/i };
const concernPatterns = {
  coarse: /coarse|soften|softening|unruly|wir[ey]|rough hair|condition(?:ing|er)?|tame/i,
  dry_skin: /dry skin|skin underneath|flak|itch/i,
  conditioning: /condition|soften|softening|nourish/i,
  both: /condition|soften|hydrat|moisturi[sz]/i,
  hydration: /hydrat|moisturi[sz]|dryness|dry skin/i,
};
export function shoppingSignal(message: string, context: ShoppingContext = {}) {
  return /\bproduct|\bshop|\bcollection|\bbuy|\bpurchas|\bpomade|\bbalm|\bmatte|\bhold|\bfinish|\bingredient|\bprice|how much|\bavailable|\bavailability|\bstock|\bcompare|\bgift|\bbeard|whisker|dry skin|coarse hair|styling|\bhair\b|shampoo|conditioner|hydration|moisturi[sz]|\bsoften/i.test(message)
    || (Boolean(context.productHandle) && /\bthis\b|\bit\b|price|ingredient|available|detail/i.test(message))
    || (message.length < 150 && /coarse|underneath|both|shine|hydration|hair|skin|conditioning/i.test(message) && (context.messages ?? []).some(q => /beard|product|styling|shop/i.test(q)));
}
export function inferShoppingNeed(message: string, context: ShoppingContext = {}): ShoppingNeed {
  const q = [...(context.messages ?? []).slice(-3), message].join("\n");
  const n = { ...empty, shopping: shoppingSignal(message, context) };
  // Latest explicit category takes precedence over earlier questions.
  for (const text of [q, message]) {
    if (categoryPatterns.beard.test(text)) n.category = "beard";
    else if (categoryPatterns.skin.test(text) && !(n.category === "beard" && /both|underneath/i.test(text))) n.category = "skin";
    else if ((categoryPatterns.hair.test(text) || /\bhold\b|\bfinish\b|\bmatte\b|\bshine\b/i.test(text)) && !(n.category === "beard" && /coarse hair|mostly.*hair/i.test(text))) n.category = "hair";
  }
  if (/\bboth\b/i.test(message) && n.category === "beard") n.concern = "both";
  else if (concernPatterns.dry_skin.test(message)) n.concern = "dry_skin";
  else if (concernPatterns.coarse.test(message)) n.concern = "coarse";
  else if (concernPatterns.hydration.test(message)) n.concern = "hydration";
  else if (concernPatterns.dry_skin.test(q)) n.concern = "dry_skin";
  else if (concernPatterns.coarse.test(q)) n.concern = "coarse";
  else if (concernPatterns.hydration.test(q)) n.concern = "hydration";
  if (/matte|no shine|without shine/i.test(q)) n.finish = "matte";
  else if (/shine|shiny|gloss/i.test(q)) n.finish = "shine";
  if (/high hold|strong hold|firm hold|maximum hold/i.test(q)) n.hold = "high";
  else if (/light hold|flexible hold|soft hold/i.test(q)) n.hold = "light";
  n.gift = /\bgift|present for/i.test(q);
  return n;
}
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
/** Claims are matched clause by clause; negated claims cannot establish suitability. */
function positive(text: string, pattern: RegExp) {
  return text.split(/[.!?;\n]/).some(clause => pattern.test(clause) && !/\b(?:not|no|without|never|avoid|isn.t|doesn.t|cannot|can.t)\b/i.test(clause));
}
function supports(product: ShopProduct, n: ShoppingNeed) {
  const metadata = [product.productType, product.category, product.name].filter(Boolean).join(" ");
  const text = [product.description, product.attributes?.benefits, product.attributes?.concerns, product.attributes?.finish, product.attributes?.hold].filter(Boolean).join(". ");
  const all = metadata + ". " + text;
  const metadataCategory = categoryPatterns.beard.test(metadata) ? "beard" : categoryPatterns.skin.test(metadata) ? "skin" : categoryPatterns.hair.test(metadata) ? "hair" : null;
  if (n.category && metadataCategory && n.category !== metadataCategory) return false;
  if (n.category && !positive(all, categoryPatterns[n.category])) return false;
  if (n.concern === "both" && !(positive(text, concernPatterns.coarse) && positive(text, concernPatterns.dry_skin))) return false;
  if (n.concern && !positive(text, concernPatterns[n.concern])) return false;
  if (n.finish && !positive(text, n.finish === "matte" ? /\bmatte\b/i : /shine|gloss/i)) return false;
  if (n.hold && !positive(text, n.hold === "high" ? /(?:high|strong|firm|maximum)[ -]hold/i : /(?:light|flexible|soft)[ -]hold/i)) return false;
  if (n.gift && !n.category && !positive(all, /gift|set|kit/i)) return false;
  return Boolean(n.category || n.concern || n.finish || n.hold || n.gift);
}
function evidence(product: ShopProduct) {
  return [product.attributes?.benefits, product.attributes?.finish && `Finish: ${product.attributes.finish}`, product.attributes?.hold && `Hold: ${product.attributes.hold}`].filter((s): s is string => Boolean(s)).map(s => s.slice(0, 350));
}
export function recommendProducts(catalog: CollectionSnapshot, message: string, context: ShoppingContext = {}, semantic?: ShoppingNeed): ShoppingReply {
  const need = semantic ?? inferShoppingNeed(message, context);
  const result = (text: string, products: ShopProduct[] = [], question?: string, suggestions: string[] = []): ShoppingReply => ({
    text, links: [{ label: "Explore the Collection", href: "/shop" }], mode: "verified",
    shopping: { products: products.map(product => ({ product, evidence: evidence(product) })), checkout: catalog.state === "ready" && catalog.checkout, question, suggestions },
  });
  if (catalog.state !== "ready") return result(catalog.state === "unavailable" ? catalog.message : "The Collection is still in preparation. I can guide your search, but concepts are not verified inventory. Prices, stock and checkout are not active.");
  const q = normalize(message);
  const named = catalog.items.filter(p => q.includes(normalize(p.name)) || q.includes(normalize(p.handle)));
  const contextual = catalog.items.find(p => p.handle === context.productHandle);
  const comparison = /compar|difference|versus|\bvs\b|which of|between/i.test(message);
  if (comparison) {
    if (named.length < 2 || new Set(named.map(p=>normalize(p.name))).size < 2) return result("Which two published products would you like to compare? Give me their names so I can use their actual descriptions and options.", named, "Which two products?", []);
    return result("Here are their published descriptions, finish and hold details where supplied, and current options side by side. Missing details are not confirmed; I won’t infer ingredients or performance from a product name.", named.slice(0, 2));
  }
  if (named.length || (contextual && /this|it|ingredient|price|available|stock|tell me|detail/i.test(message))) {
    const products = named.length ? named.slice(0, 3) : [contextual!];
    const unavailable = products.every(p => !p.variants.some(v => v.availableForSale));
    return result(unavailable ? "Shopify currently marks these options unavailable. I can show their published details, but there is no available option to add to your cart." : "Here are the current Shopify details. Choose an option if it suits you; availability is checked again when you add it to your cart.", products);
  }
  if (need.category === "beard" && /\bdry\b/i.test(message) && !/coarse|skin|underneath|both/i.test(message)) return result("Absolutely. Are you mainly dealing with coarse beard hair, dry skin underneath, or a combination of both?", [], "What needs attention?", ["Mostly coarse beard hair", "Dry skin underneath my beard", "Both coarse hair and dry skin"]);
  if (need.category === "hair" && !need.finish && !need.hold && !need.concern) return result("What finish and hold do you prefer? That will help me narrow the styling options.", [], "Choose a styling direction", ["Matte finish and high hold", "Shine and light hold"]);
  if (!need.category && !need.finish && !need.hold && !need.concern && !need.gift) {
    if (/\bavailability|\bstock|\bunavailable/i.test(message)) return result("Which product would you like me to check? I’ll use the published Shopify options.", [], "Which product?");
    return result("Are you shopping for beard care, hairstyling, skin hydration, or a gift? Tell me what you want it to do, and I’ll check the published Collection.", [], "What are you looking for?", ["Soften coarse beard hair", "Matte finish and high hold", "Skin hydration", "A grooming gift"]);
  }
  if (need.gift && !need.category) return result("What does the recipient enjoy: beard care, hairstyling, or skincare? If you have a budget, include that too.", [], "A gift for which routine?", ["A beard-care gift", "A hairstyling gift", "A skincare gift"]);
  const budgetMatch = [...[...(context.messages ?? []), message].join(" ").matchAll(/(under|below|less than|up to|budget(?: is| of)?)\s*\$?\s*(\d{1,5}(?:\.\d{1,2})?)(?![\d,])/gi)].at(-1);
  const budget = budgetMatch ? Number(budgetMatch[2]) : null;
  const matching = catalog.items.filter(p => supports(p, need)).map(p => budget === null ? p : ({...p, variants:p.variants.filter(v=>(/under|below|less than/i.test(budgetMatch![1]) ? Number(v.price.amount)<budget : Number(v.price.amount)<=budget))})).filter(p=>p.variants.length>0);
  const available = matching.filter(p => p.variants.some(v => v.availableForSale));
  if (!available.length) return result(matching.length ? "I found matching published products, but Shopify marks every option unavailable. There is no available option to add to your cart right now." : "I couldn’t verify a product that meets those preferences in the current Collection. I’d rather be precise than suggest an unsupported match. We can adjust the preferences or explore the published products.", matching.slice(0, 3));
  return result(`These ${available.length === 1 ? "published details match" : "options match"} your preferences based on Shopify’s descriptions and attributes. Review the details below. ${catalog.checkout ? "You can choose an option and add it to your cart when you’re ready." : "Purchasing is not open yet."}`, available.slice(0, 3));
}
