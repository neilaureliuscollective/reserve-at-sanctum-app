import { squareFetch } from "./client";
import type { SquareSubscription } from "./types";

export async function retrieveSquareSubscription(id: string) {
  return squareFetch<{ subscription?: SquareSubscription }>(`/v2/subscriptions/${id}`);
}

export async function searchSquareSubscriptions(customerIds?: string[]) {
  return squareFetch<{ subscriptions?: SquareSubscription[] }>("/v2/subscriptions/search", {
    method: "POST",
    body: customerIds?.length ? { query: { filter: { customer_ids: customerIds } } } : {},
  });
}

export async function createSquareSubscription(
  body: {
    locationId: string;
    customerId: string;
    planVariationId: string;
  },
  key?: string,
) {
  return squareFetch<{ subscription?: SquareSubscription }>("/v2/subscriptions", {
    method: "POST",
    body: {
      location_id: body.locationId,
      customer_id: body.customerId,
      plan_variation_id: body.planVariationId,
    },
    idempotencyKey: key,
  });
}
