import { squareFetch } from "./client";
import type { SquareLocation } from "./types";

export async function listSquareLocations() {
  return squareFetch<{ locations?: SquareLocation[] }>("/v2/locations");
}

export async function retrieveSquareLocation(id: string) {
  return squareFetch<{ location?: SquareLocation }>(`/v2/locations/${id}`);
}
