import { database } from "@/lib/db";
import { verifyShopify, ingestShopify } from "@/domains/shopify/events";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!secret)
    return Response.json(
      { error: "Shopify app is not configured" },
      { status: 503 },
    );
  if (!req.body)
    return Response.json({ error: "Missing body" }, { status: 400 });
  const reader = req.body.getReader(),
    chunks: Uint8Array[] = [];
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
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  } finally {
    reader.releaseLock();
  }
  let event;
  try {
    event = verifyShopify(Buffer.concat(chunks), req.headers, secret);
  } catch {
    return Response.json(
      { error: "Invalid Shopify delivery" },
      { status: 400 },
    );
  }
  try {
    await ingestShopify(await database(), event);
  } catch {
    return Response.json(
      { error: "Durable receipt unavailable" },
      { status: 503 },
    );
  }
  return Response.json({ received: true });
}
