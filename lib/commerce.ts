import { brand } from "./brand";
import { productConcepts } from "./product-concepts";
import { listSquareCatalog } from "./square/catalog";
import { squarePublicStatus } from "./square/config";
import { fulfillmentIntents } from "./square/types";

export { getProductConcept, productConcepts, type ProductConcept } from "./product-concepts";

export function commerceStatus() {
  const square = squarePublicStatus();
  return {
    brand: brand.name,
    source: "square" as const,
    connected: square.enabled,
    checkout: false,
    publicPricing: false,
    memberPricing: false,
    liveCatalog: false,
    fulfillments: fulfillmentIntents,
    products: [] as const,
    concepts: productConcepts,
    square,
  };
}

export async function liveShopCatalog() {
  const status = commerceStatus();
  if (!status.connected) {
    return { ...status, items: [] as Array<{ id: string; name: string }> };
  }
  const result = await listSquareCatalog();
  if (!result.enabled || !result.ok) {
    return { ...status, items: [] as Array<{ id: string; name: string }> };
  }
  const items = (result.data.objects ?? [])
    .filter((object) => object.type === "ITEM" && !object.isDeleted)
    .map((object) => ({
      id: object.id,
      name: object.itemData?.name || "Untitled item",
    }));
  return { ...status, liveCatalog: items.length > 0, items };
}
