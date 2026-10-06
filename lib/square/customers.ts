import { squareFetch } from "./client";
import type { SquareCustomer, SquareResult } from "./types";

export async function retrieveSquareCustomer(id: string) {
  return squareFetch<{ customer?: SquareCustomer }>(`/v2/customers/${id}`);
}

export async function searchSquareCustomers(query?: string) {
  return squareFetch<{ customers?: SquareCustomer[] }>("/v2/customers/search", {
    method: "POST",
    body: query ? { query: { filter: { emailAddress: { exact: query } } } } : {},
  });
}

export async function upsertSquareCustomer(input: {
  givenName?: string;
  familyName?: string;
  emailAddress?: string;
  referenceId?: string;
  idempotencyKey?: string;
}): Promise<SquareResult<{ customer?: SquareCustomer }>> {
  return squareFetch<{ customer?: SquareCustomer }>("/v2/customers", {
    method: "POST",
    body: input,
    idempotencyKey: input.idempotencyKey,
  });
}
