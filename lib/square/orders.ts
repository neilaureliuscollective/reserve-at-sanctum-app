import { squareFetch } from "./client";
import type { FulfillmentIntent, SquareOrder } from "./types";
import { squareFulfillmentType } from "./types";

export async function retrieveSquareOrder(id: string) {
  return squareFetch<{ order?: SquareOrder }>(`/v2/orders/${id}`);
}

export async function searchSquareOrders(locationIds: string[]) {
  return squareFetch<{ orders?: SquareOrder[] }>("/v2/orders/search", {
    method: "POST",
    body: { location_ids: locationIds },
  });
}

/** Builds a Square Orders payload. Does not invent catalog lines or prices. */
export function orderDraft(input: {
  locationId: string;
  customerId?: string;
  referenceId?: string;
  intent: FulfillmentIntent;
  lineItems: Array<{ catalogObjectId: string; quantity: string }>;
}) {
  return {
    order: {
      location_id: input.locationId,
      customer_id: input.customerId,
      reference_id: input.referenceId,
      line_items: input.lineItems.map((item) => ({
        catalog_object_id: item.catalogObjectId,
        quantity: item.quantity,
      })),
      fulfillments: [
        {
          type: squareFulfillmentType(input.intent),
        },
      ],
    },
  };
}

export async function createSquareOrder(
  draft: ReturnType<typeof orderDraft>,
  key?: string,
) {
  return squareFetch<{ order?: SquareOrder }>("/v2/orders", {
    method: "POST",
    body: draft,
    idempotencyKey: key,
  });
}
