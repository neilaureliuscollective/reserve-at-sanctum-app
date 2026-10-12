import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { BookingError } from "./booking-error";
import type { Database, Queryable, Row } from "./db";
export const receiptStatus = { "email.sent": "accepted", "email.delivery_delayed": "delayed", "email.delivered": "delivered", "email.bounced": "bounced", "email.complained": "complained", "email.failed": "failed", "email.suppressed": "suppressed" } as const;
export type ReceiptStatus = typeof receiptStatus[keyof typeof receiptStatus];
/** Standard Webhooks v1 (also exposed as svix-* headers by Resend). Verify the
 * exact bytes, message id and delivery timestamp before parsing any JSON.
 * Reference: standard-webhooks official JS SDK; 5-minute replay tolerance. */
export function verifyReceiptSignature(raw: Uint8Array, headers: Headers, secret: string, now = Date.now()) {
  const id = headers.get("svix-id") || headers.get("webhook-id");
  const timestamp = headers.get("svix-timestamp") || headers.get("webhook-timestamp");
  const signatures = headers.get("svix-signature") || headers.get("webhook-signature");
  if (!id || id.length > 200 || !timestamp || !/^\d{1,12}$/.test(timestamp) || !signatures || signatures.length > 4096 || Math.abs(now / 1000 - Number(timestamp)) > 300)
    throw new BookingError("Invalid webhook signature.", 401);
  if (!/^whsec_[A-Za-z0-9+/]+={0,2}$/.test(secret)) throw new BookingError("Receipt verification is unavailable.", 503);
  const key = Buffer.from(secret.slice(6), "base64");
  if (key.length < 24) throw new BookingError("Receipt verification is unavailable.", 503);
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.`).update(raw).digest();
  const valid = signatures.split(" ").some(part => {
    const [version, signature] = part.split(",");
    if (version !== "v1" || !signature || !/^[A-Za-z0-9+/]+={0,2}$/.test(signature)) return false;
    const supplied = Buffer.from(signature, "base64");
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
  });
  if (!valid) throw new BookingError("Invalid webhook signature.", 401);
  return id;
}
const envelope = z.object({ type: z.string().max(80), created_at: z.iso.datetime({ offset: true }), data: z.object({ email_id: z.string().min(1).max(200) }) });
export function parseReceipt(raw: Uint8Array, id: string) {
  let value: unknown;
  try { value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw)); }
  catch { throw new BookingError("Invalid receipt."); }
  // Tracking opens/clicks and inbound/contact events is outside this launch.
  const type = (value as { type?: string } | null)?.type;
  if (!type || !(Object.hasOwn(receiptStatus,type))) return null;
  const input = envelope.parse(value);
  return { id, providerId: input.data.email_id, status: receiptStatus[type as keyof typeof receiptStatus], occurredAt: input.created_at };
}
export type Receipt = NonNullable<ReturnType<typeof parseReceipt>>;
/** Priority prevents late accepted/delayed events from downgrading delivery or
 * hiding a bounce/complaint. All minimal events remain durable for audit. */
export async function reconcileReceipt(tx: Queryable, providerId: string) {
  const [latest] = await tx.query<Row & { status: ReceiptStatus; occurred_at: Date | string }>(
    `SELECT status,occurred_at FROM reserve_booking_receipts WHERE provider_message_id=$1
     ORDER BY CASE status WHEN 'complained' THEN 7 WHEN 'bounced' THEN 6 WHEN 'suppressed' THEN 5 WHEN 'failed' THEN 4 WHEN 'delivered' THEN 3 WHEN 'delayed' THEN 2 ELSE 1 END DESC,occurred_at DESC,id DESC LIMIT 1`, [providerId]);
  if (latest) {
    await tx.query("UPDATE reserve_booking_messages SET delivery_handled_at=CASE WHEN delivery_status IS DISTINCT FROM $2 OR delivery_updated_at IS DISTINCT FROM $3::timestamptz THEN NULL ELSE delivery_handled_at END,delivery_handled_by=CASE WHEN delivery_status IS DISTINCT FROM $2 OR delivery_updated_at IS DISTINCT FROM $3::timestamptz THEN NULL ELSE delivery_handled_by END,delivery_status=$2,delivery_updated_at=$3 WHERE provider_message_id=$1", [providerId,latest.status,latest.occurred_at]);
    await tx.query("UPDATE reserve_booking_receipts r SET message_id=m.id FROM reserve_booking_messages m WHERE m.provider_message_id=$1 AND r.provider_message_id=m.provider_message_id AND r.message_id IS NULL", [providerId]);
  }
}
export async function recordReceipt(db: Database, receipt: Receipt) {
  return db.transaction(async tx => {
    const rows = await tx.query("INSERT INTO reserve_booking_receipts(id,provider_message_id,status,occurred_at) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING RETURNING id", [receipt.id,receipt.providerId,receipt.status,receipt.occurredAt]);
    if (!rows.length) {
      const [existing] = await tx.query("SELECT provider_message_id,status,occurred_at FROM reserve_booking_receipts WHERE id=$1", [receipt.id]);
      if (existing.provider_message_id !== receipt.providerId || existing.status !== receipt.status || new Date(existing.occurred_at as string).getTime() !== Date.parse(receipt.occurredAt))
        throw new BookingError("Receipt identifier was reused.", 409);
    }
    // Receipt can arrive before provider acceptance commits; retain its provider
    // reference, then reconcile on acceptance and every subsequent worker run.
    await tx.query("SELECT id FROM reserve_booking_messages WHERE provider_message_id=$1 FOR UPDATE", [receipt.providerId]);
    await reconcileReceipt(tx,receipt.providerId);
    return { duplicate: !rows.length };
  });
}
export async function reconcilePendingReceipts(db: Database) {
  // Accepted rows only; receipt processing never requeues or resends an email.
  await db.transaction(async tx => {
    const rows = await tx.query<{ provider_message_id: string }>(
      `SELECT m.provider_message_id FROM reserve_booking_messages m WHERE m.provider_message_id IS NOT NULL AND EXISTS
       (SELECT 1 FROM reserve_booking_receipts r WHERE r.provider_message_id=m.provider_message_id AND r.message_id IS NULL)
       ORDER BY m.id LIMIT 50 FOR UPDATE OF m SKIP LOCKED`);
    for (const row of rows) await reconcileReceipt(tx,row.provider_message_id);
  });
}
export async function readReceiptBytes(request: Request, limit = 32768) {
  if (!request.body) throw new BookingError("Receipt required.");
  const reader = request.body.getReader(); let size=0; const chunks: Uint8Array[]=[];
  try {
    while (true) {
      const {done,value}=await reader.read(); if (done) break;
      size+=value.byteLength; if (size>limit) { await reader.cancel(); throw new BookingError("Receipt too large.",413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks,size);
}
