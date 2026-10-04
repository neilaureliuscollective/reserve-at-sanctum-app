import { legacyRegisterAllowed } from "@/domains/shopify/mode";
import { database } from "@/lib/db";
import { verifyStripeEvent } from "@/domains/commerce/stripe";
import { ingestEvent } from "@/domains/commerce/payments";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  if (!legacyRegisterAllowed())
    return Response.json(
      { error: "Stripe checkout is disabled. Use Shopify." },
      { status: 410 },
    );
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret)
    return Response.json(
      { error: "Webhook is not configured" },
      { status: 503 },
    );
  try {
    if (!req.body)
      return Response.json({ error: "Missing body" }, { status: 400 });
    const reader = req.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 524288) {
          await reader.cancel();
          return Response.json({ error: "Too large" }, { status: 413 });
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    const event = verifyStripeEvent(
      raw,
      req.headers.get("stripe-signature") || "",
      secret,
    );
    try {
      await ingestEvent(await database(), event);
    } catch {
      return Response.json(
        { error: "Durable receipt unavailable" },
        { status: 503 },
      );
    }
    return Response.json({ received: true });
  } catch {
    return Response.json(
      { error: "Webhook verification or durable receipt failed" },
      { status: 400 },
    );
  }
}
