import { configured, database } from "@/lib/db";
import { squareConfig } from "@/lib/square/config";
import {
  handleSquareWebhookFamily,
  markSquareWebhookEvent,
  parseSquareWebhookEvent,
  payloadDigest,
  recordSquareWebhookEvent,
  routeSquareWebhook,
  SQUARE_SIGNATURE_HEADER,
  verifySquareWebhookSignature,
} from "@/lib/square/webhooks";

export const dynamic = "force-dynamic";

const MAX_BODY = 262144;

export async function POST(request: Request) {
  const config = squareConfig();
  if (!config.webhooksEnabled) {
    return Response.json({ error: "Square webhooks are not configured." }, { status: 503 });
  }

  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BODY) {
    return Response.json({ error: "Payload too large." }, { status: 413 });
  }

  const body = await request.text();
  if (body.length > MAX_BODY) {
    return Response.json({ error: "Payload too large." }, { status: 413 });
  }

  const valid = verifySquareWebhookSignature({
    signatureHeader: request.headers.get(SQUARE_SIGNATURE_HEADER) || "",
    body,
    signatureKey: config.webhookSignatureKey,
    notificationUrl: config.webhookNotificationUrl,
  });
  if (!valid) {
    return Response.json({ error: "Invalid signature." }, { status: 403 });
  }

  const event = parseSquareWebhookEvent(body);
  if (!event) {
    return new Response(null, { status: 200 });
  }

  const family = routeSquareWebhook(event.type);
  if (configured()) {
    try {
      const db = await database();
      const accepted = await recordSquareWebhookEvent(
        db,
        event,
        payloadDigest(body),
        config.environment,
      );
      if (accepted) {
        await handleSquareWebhookFamily(family, event);
        await markSquareWebhookEvent(db, event.event_id, family === "ignored" ? "ignored" : "processed");
      }
    } catch {
      /* Receipt still wins. Durable retry can follow from Square if we fail closed later. */
    }
  }

  return new Response(null, { status: 200 });
}
