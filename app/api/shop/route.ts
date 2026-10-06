import { liveShopCatalog } from "@/lib/commerce";

export const dynamic = "force-dynamic";

export async function GET() {
  const catalog = await liveShopCatalog();
  return Response.json(
    {
      source: catalog.source,
      connected: catalog.connected,
      checkout: catalog.checkout,
      liveCatalog: catalog.liveCatalog,
      fulfillments: catalog.fulfillments,
      items: catalog.items,
      concepts: catalog.concepts.map((item) => ({
        id: item.id,
        name: item.name,
        family: item.family,
        href: `/shop/${item.id}`,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
