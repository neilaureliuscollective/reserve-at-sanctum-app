/** Bounded, network-only requests. Never retries a booking mutation. */
export async function bookingRequest<T>(url: string, init: RequestInit = {}, timeoutMs = 12000): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort(init.signal?.reason);
  if (init.signal?.aborted) abort();
  else init.signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, cache: "no-store", signal: controller.signal });
    const body = await response.json();
    if (!response.ok) throw Error(typeof body.error === "string" ? body.error : "This request could not finish. Please try again.");
    return body as T;
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener("abort", abort);
  }
}
