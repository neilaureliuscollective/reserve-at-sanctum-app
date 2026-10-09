import { test } from "node:test";
import assert from "node:assert/strict";
import { bookingRequest } from "../lib/booking-request";
test("booking transport bounds stalled reads, propagates cancellation, and never retries uncertain mutations", async t => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (_url: unknown, init: RequestInit) => {
    calls++;
    assert.equal(init.cache, "no-store");
    return await new Promise<Response>((_resolve, reject) => {
      const abort = () => reject(new DOMException("Request aborted", "AbortError"));
      if (init.signal?.aborted) abort(); else init.signal?.addEventListener("abort", abort, { once: true });
    });
  });
  await assert.rejects(bookingRequest("/api/appointments", { method: "POST" }, 20), { name: "AbortError" });
  assert.equal(calls, 1);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(bookingRequest("/api/appointments", { signal: controller.signal }), { name: "AbortError" });
  assert.equal(calls, 2);
});
test("booking transport distinguishes denied or conflicting responses from success", async t => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ error: "This time is already reserved." }, { status: 409 }));
  await assert.rejects(bookingRequest("/api/appointments"), /already reserved/);
  t.mock.method(globalThis, "fetch", async () => Response.json({ visits: [] }));
  assert.deepEqual(await bookingRequest("/api/appointments"), { visits: [] });
});
