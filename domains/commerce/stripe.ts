import { createHmac, timingSafeEqual } from "node:crypto";
import { BookingError } from "../../lib/booking";
import type {
  Processor,
  Order,
  Line,
  Refund,
  Session,
  ProcessorRefund,
} from "./types";
async function request<T>(
  path: string,
  body?: URLSearchParams,
  key?: string,
): Promise<T> {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret || !process.env.STRIPE_ACCOUNT_ID)
    throw new BookingError("The payment processor is not commissioned.", 503);
  if (
    secret.startsWith("sk_live_") &&
    (process.env.RESERVE_LIVE_COMMERCE !== "true" ||
      process.env.NODE_ENV !== "production")
  )
    throw new BookingError(
      "Live payments are disabled in this environment.",
      503,
    );
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "Stripe-Version": "2026-02-25.clover",
      Authorization: `Bearer ${secret}`,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(key ? { "Idempotency-Key": key } : {}),
    },
    body: body?.toString(),
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok)
    throw new BookingError(
      "Payment processor request failed. Reconcile or retry this same order.",
      503,
    );
  return r.json();
}
async function merchant() {
  const account = await request<{ id: string }>("account");
  if (account.id !== process.env.STRIPE_ACCOUNT_ID)
    throw new BookingError(
      "Payment account does not match the configured merchant.",
      503,
    );
}
export function processorAvailable() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_ACCOUNT_ID,
  );
}
export const stripeProcessor: Processor = {
  async create(o: Order, lines: Line[]) {
    await merchant();
    const origin = process.env.APP_ORIGIN;
    if (!origin)
      throw new BookingError("Application origin is not configured.", 503);
    const body = new URLSearchParams({
      mode: "payment",
      "payment_method_types[0]": "card",
      client_reference_id: o.id,
      "metadata[reserve_order_id]": o.id,
      "payment_intent_data[metadata][reserve_order_id]": o.id,
      success_url: `${origin}/receipt/${o.id}?payment=processing`,
      cancel_url: `${origin}/receipt/${o.id}?payment=pending`,
    });
    const charges = lines
      .map((l) => ({
        name: `${l.quantity} × ${l.name}`,
        amount: l.quantity * l.unit_price - l.discount + l.tax,
      }))
      .filter((l) => l.amount > 0);
    if (o.tip) charges.push({ name: "Gratuity", amount: o.tip });
    if (charges.reduce((sum, l) => sum + l.amount, 0) !== o.total)
      throw new BookingError(
        "Checkout totals do not match the frozen receipt.",
        409,
      );
    charges.forEach((line, index) => {
      const key = `line_items[${index}]`;
      body.set(`${key}[price_data][currency]`, "usd");
      body.set(`${key}[price_data][unit_amount]`, String(line.amount));
      body.set(`${key}[price_data][product_data][name]`, line.name);
      body.set(
        `${key}[price_data][product_data][description]`,
        "Approved discount and applicable tax included",
      );
      body.set(`${key}[quantity]`, "1");
    });
    return request<Session>(
      "checkout/sessions",
      body,
      `reserve-checkout:${o.id}`,
    );
  },
  async session(id) {
    await merchant();
    return request<Session>(`checkout/sessions/${encodeURIComponent(id)}`);
  },
  async expire(id) {
    await merchant();
    return request<Session>(
      `checkout/sessions/${encodeURIComponent(id)}/expire`,
      new URLSearchParams(),
      `reserve-expire:${id}`,
    );
  },
  async refund(r: Refund, intent) {
    await merchant();
    return request<ProcessorRefund>(
      "refunds",
      new URLSearchParams({
        payment_intent: intent,
        amount: String(r.amount),
        "metadata[reserve_refund_id]": r.id,
      }),
      `reserve-refund:${r.id}`,
    );
  },
  async getRefund(id) {
    await merchant();
    return request<ProcessorRefund>(`refunds/${encodeURIComponent(id)}`);
  },
};
export type PaymentEvent = {
  id: string;
  type: string;
  livemode: boolean;
  data: { object: { id: string; metadata?: Record<string, string> } };
};
export function verifyStripeEvent(
  raw: string,
  signature: string,
  secret: string,
  now = Math.floor(Date.now() / 1000),
): PaymentEvent {
  const parts = signature.split(",").map((v) => v.split("="));
  const t = parts.find(([k]) => k === "t")?.[1];
  if (!t || !/^\d+$/.test(t) || Math.abs(now - Number(t)) > 300)
    throw new BookingError("Invalid webhook signature.", 400);
  const expected = createHmac("sha256", secret).update(`${t}.${raw}`).digest();
  const valid = parts.some(
    ([k, v]) =>
      k === "v1" &&
      /^[a-f0-9]{64}$/.test(v) &&
      timingSafeEqual(Buffer.from(v, "hex"), expected),
  );
  if (!valid) throw new BookingError("Invalid webhook signature.", 400);
  let event: PaymentEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    throw new BookingError("Invalid webhook event.", 400);
  }
  if (
    !event.id ||
    !event.type ||
    !event.data?.object?.id ||
    typeof event.livemode !== "boolean"
  )
    throw new BookingError("Invalid webhook event.", 400);
  const live = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") || false;
  if (event.livemode !== live)
    throw new BookingError("Payment environment mismatch.", 400);
  return event;
}
