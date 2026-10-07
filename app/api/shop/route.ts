import { readCollection } from "@/lib/collection";
import { fulfillmentIntents } from "@/lib/square/types";
import { productConcepts } from "@/lib/product-concepts";
export const dynamic = "force-dynamic";
export async function GET() {
  const catalog = await readCollection();
  return Response.json(
    {
      ...catalog,
      fulfillments: catalog.source === "square" ? fulfillmentIntents : [],
      connected: catalog.legacyConnected ?? catalog.state === "ready",
      items:
        catalog.source === "square"
          ? (catalog.readOnlyItems ?? [])
          : catalog.items,
      liveCatalog:
        catalog.state === "ready" || Boolean(catalog.readOnlyItems?.length),
      concepts: productConcepts.map((item) => ({
        id: item.id,
        name: item.name,
        family: item.family,
        href: `/shop/${item.id}`,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
