import { squareFetch } from "./client";
import { squareConfig } from "./config";
import type { SquareInventoryCount } from "./types";

export async function retrieveSquareInventory(catalogObjectIds: string[], locationIds?: string[]) {
  if (!catalogObjectIds.length) {
    return squareConfig().enabled
      ? { enabled: true as const, ok: true as const, data: { counts: [] as SquareInventoryCount[] } }
      : { enabled: false as const, reason: "not_configured" as const };
  }
  return squareFetch<{ counts?: SquareInventoryCount[] }>(
    "/v2/inventory/counts/batch-retrieve",
    {
      method: "POST",
      body: {
        catalog_object_ids: catalogObjectIds,
        location_ids: locationIds,
      },
    },
  );
}
