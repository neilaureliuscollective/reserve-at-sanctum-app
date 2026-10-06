import { squareFetch } from "./client";
import type { SquarePayment } from "./types";

export async function retrieveSquarePayment(id: string) {
  return squareFetch<{ payment?: SquarePayment }>(`/v2/payments/${id}`);
}

export async function listSquarePayments(locationId?: string) {
  return squareFetch<{ payments?: SquarePayment[] }>("/v2/payments", {
    query: { location_id: locationId },
  });
}

/** Payments stay in Square. This only prepares a create-payment body. */
export function paymentDraft(input: {
  sourceId: string;
  amount: number;
  currency?: string;
  locationId: string;
  orderId?: string;
  customerId?: string;
  referenceId?: string;
}) {
  return {
    source_id: input.sourceId,
    amount_money: { amount: input.amount, currency: input.currency || "USD" },
    location_id: input.locationId,
    order_id: input.orderId,
    customer_id: input.customerId,
    reference_id: input.referenceId,
    autocomplete: true,
  };
}

export async function createSquarePayment(
  draft: ReturnType<typeof paymentDraft>,
  key?: string,
) {
  return squareFetch<{ payment?: SquarePayment }>("/v2/payments", {
    method: "POST",
    body: draft,
    idempotencyKey: key,
  });
}
