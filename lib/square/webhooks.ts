import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { Queryable } from "../db";
import { squareConfig } from "./config";
import type { SquareWebhookEvent } from "./types";

export const SQUARE_SIGNATURE_HEADER = "x-square-hmacsha256-signature";

const eventSchema = z.object({
  merchant_id: z.string().optional(),
  type: z.string().min(1),
  event_id: z.string().min(1),
  created_at: z.string().optional(),
  data: z
    .object({
      type: z.string().optional(),
      id: z.string().optional(),
      object: z.unknown().optional(),
    })
    .optional(),
});

export const squareWebhookRoutes = {
  "customer.created": "customer",
  "customer.updated": "customer",
  "booking.created": "booking",
  "booking.updated": "booking",
  "payment.created": "payment",
  "payment.updated": "payment",
  "order.created": "order",
  "order.updated": "order",
  "order.fulfillment.updated": "fulfillment",
  "inventory.count.updated": "inventory",
  "subscription.created": "subscription",
  "subscription.updated": "subscription",
} as const;

export type SquareWebhookFamily =
  (typeof squareWebhookRoutes)[keyof typeof squareWebhookRoutes];

export function squareWebhookSignature(
  notificationUrl: string,
  body: string,
  signatureKey: string,
) {
  return createHmac("sha256", signatureKey)
    .update(notificationUrl + body)
    .digest("base64");
}

export function verifySquareWebhookSignature(input: {
  signatureHeader: string;
  body: string;
  signatureKey: string;
  notificationUrl: string;
}) {
  if (!input.signatureHeader || !input.signatureKey || !input.notificationUrl) {
    return false;
  }
  const expected = squareWebhookSignature(
    input.notificationUrl,
    input.body,
    input.signatureKey,
  );
  const presented = Buffer.from(input.signatureHeader);
  const computed = Buffer.from(expected);
  return presented.length === computed.length && timingSafeEqual(presented, computed);
}

export function parseSquareWebhookEvent(body: string): SquareWebhookEvent | null {
  try {
    return eventSchema.parse(JSON.parse(body));
  } catch {
    return null;
  }
}

export function payloadDigest(body: string) {
  return createHash("sha256").update(body).digest("hex");
}

export function routeSquareWebhook(type: string): SquareWebhookFamily | "ignored" {
  return squareWebhookRoutes[type as keyof typeof squareWebhookRoutes] ?? "ignored";
}

export async function recordSquareWebhookEvent(
  db: Queryable,
  event: SquareWebhookEvent,
  digest: string,
  environment: string,
) {
  const inserted = await db.query<{ event_id: string }>(
    `INSERT INTO square_webhook_events(event_id,event_type,square_merchant_id,square_environment,payload_digest,status)
     VALUES($1,$2,$3,$4,$5,'accepted')
     ON CONFLICT (event_id) DO NOTHING
     RETURNING event_id`,
    [event.event_id, event.type, event.merchant_id ?? null, environment, digest],
  );
  return inserted.length > 0;
}

export async function markSquareWebhookEvent(
  db: Queryable,
  eventId: string,
  status: "processed" | "ignored" | "failed",
) {
  await db.query(
    "UPDATE square_webhook_events SET status=$2, processed_at=now() WHERE event_id=$1",
    [eventId, status],
  );
}

export async function handleSquareWebhookFamily(
  _family: SquareWebhookFamily | "ignored",
  _event: SquareWebhookEvent,
) {
  /* Mapping updates stay out of the acknowledge path. Receipt is the contract. */
}

export function webhookConfiguration() {
  const config = squareConfig();
  return {
    configured: config.webhooksEnabled,
    notificationUrl: config.webhooksEnabled ? config.webhookNotificationUrl : null,
  };
}
