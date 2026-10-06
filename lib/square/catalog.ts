import { squareFetch } from "./client";
import type { SquareCatalogObject } from "./types";

export async function listSquareCatalog(types = "ITEM,ITEM_VARIATION") {
  return squareFetch<{ objects?: SquareCatalogObject[] }>("/v2/catalog/list", {
    query: { types },
  });
}

export async function searchSquareCatalog(beginTime?: string) {
  return squareFetch<{ objects?: SquareCatalogObject[] }>("/v2/catalog/search", {
    method: "POST",
    body: {
      object_types: ["ITEM", "ITEM_VARIATION", "SUBSCRIPTION_PLAN"],
      include_deleted_objects: true,
      begin_time: beginTime,
    },
  });
}

export async function retrieveSquareCatalogObject(id: string) {
  return squareFetch<{ object?: SquareCatalogObject }>(`/v2/catalog/object/${id}`);
}
