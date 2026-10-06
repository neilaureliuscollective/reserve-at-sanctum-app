import { randomUUID } from "node:crypto";
import { squareConfig } from "./config";
import type { SquareErrorBody, SquareResult } from "./types";

export class SquareRequestError extends Error {
  constructor(
    message: string,
    public status = 502,
    public errors: SquareErrorBody[] = [],
  ) {
    super(message);
  }
}

export function idempotencyKey(seed?: string) {
  return seed || randomUUID();
}

type SquareFetchInit = {
  method?: string;
  body?: unknown;
  idempotencyKey?: string;
  query?: Record<string, string | undefined>;
};

function disabled<T>(): SquareResult<T> {
  return { enabled: false, reason: "not_configured" };
}

export async function squareFetch<T>(
  path: string,
  init: SquareFetchInit = {},
): Promise<SquareResult<T>> {
  const config = squareConfig();
  if (!config.enabled) return disabled();

  const url = new URL(path.startsWith("http") ? path : `${config.baseUrl}${path}`);
  for (const [key, value] of Object.entries(init.query ?? {})) {
    if (value) url.searchParams.set(key, value);
  }

  const method = (init.method || "GET").toUpperCase();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.accessToken}`,
    Accept: "application/json",
    "Square-Version": config.apiVersion,
  };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET" && method !== "HEAD") {
    headers["Idempotency-Key"] = init.idempotencyKey || idempotencyKey();
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
    });
  } catch {
    return {
      enabled: true,
      ok: false,
      status: 503,
      errors: [{ category: "API_ERROR", code: "NETWORK", detail: "Square is unreachable." }],
    };
  }

  let payload: { errors?: SquareErrorBody[] } & T = {} as T;
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    payload = {} as T;
  }

  if (!response.ok) {
    return {
      enabled: true,
      ok: false,
      status: response.status,
      errors: payload.errors ?? [{ detail: "Square request failed." }],
    };
  }

  return { enabled: true, ok: true, data: payload };
}
