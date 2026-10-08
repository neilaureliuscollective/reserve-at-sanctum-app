import { liveShopCatalog } from "./commerce";
import { shopifySettings } from "./shopify/config";
import { shopifyCollection, type ShopProduct } from "./shopify/storefront";
export type CollectionSnapshot = {
  source: "shopify" | "square";
  state: "preview" | "ready" | "unavailable";
  checkout: boolean;
  memberPricing: false;
  items: ShopProduct[];
  message: string;
  readOnlyItems?: { id: string; name: string }[];
  legacyConnected?: boolean;
};
export async function readCollection(
  fetcher: typeof fetch = fetch,
): Promise<CollectionSnapshot> {
  const settings = shopifySettings();
  if (settings.selected) {
    if (!settings.config)
      return {
        source: "shopify",
        state: "unavailable",
        checkout: false,
        memberPricing: false,
        items: [],
        message:
          "The live Collection is not ready. Product concepts remain previews; purchasing is unavailable.",
      };
    try {
      const items = await shopifyCollection(settings.config, fetcher);
      return {
        source: "shopify",
        state: "ready",
        checkout: settings.config.checkout,
        memberPricing: false,
        items,
        message: items.length
          ? "Shopify supplies current product options and prices. Availability is checked again before checkout. Shipping and tax are confirmed at checkout."
          : "No one-time products are published in the approved Collection. Subscription purchasing is not active.",
      };
    } catch {
      return {
        source: "shopify",
        state: "unavailable",
        checkout: false,
        memberPricing: false,
        items: [],
        message:
          "The live Collection could not refresh. Please try again before purchasing.",
      };
    }
  }
  // Retain the prior read-only Square adapter. It does not authorize this checkout bridge.
  const legacy = await liveShopCatalog();
  return {
    source: "square",
    readOnlyItems: legacy.items,
    legacyConnected: legacy.connected,
    state: "preview",
    checkout: false,
    memberPricing: false,
    items: [],
    message: legacy.connected
      ? "The existing catalog connection is read-only. Verified product checkout is not open."
      : "These are product concepts. Prices, stock and purchasing are not active.",
  };
}
