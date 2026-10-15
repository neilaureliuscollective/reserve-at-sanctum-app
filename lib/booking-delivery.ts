import { deliveryConfig, deliveryAuthorized, type DeliveryConfig } from "./booking-delivery-config";
export { deliveryConfig, deliveryAuthorized, type DeliveryConfig } from "./booking-delivery-config";
import { renderBookingEmail } from "./booking-email-template";
import { reconcileReceipt, reconcilePendingReceipts } from "./booking-receipts";
import type { Database, Row } from "./db";

type Message = Row & {
  id: string; appointment_id: string; client_id: string | null; revision: number; kind: string; state: string;
  attempts: number; handled_at: Date | string | null; appointment_revision: number;
  status: string; arrived_at: Date | string | null; starts_at: Date | string; ends_at: Date | string; price: number;
  email: string | null; service_name: string; provider_name: string; timezone: string; address: string;
};
export type Sender = (message: Message, config: DeliveryConfig) => Promise<string | void>;
export async function sendBookingEmail(message: Message, config: DeliveryConfig, transport: typeof fetch = fetch) {
  const content = renderBookingEmail({...message, accountLinked: Boolean(message.client_id)}, config.origin);
  const response = await transport("https://api.resend.com/emails", {
    method: "POST", signal: AbortSignal.timeout(5000),
    headers: { Authorization: `Bearer ${config.key}`, "Content-Type": "application/json", "Idempotency-Key": `booking/${message.id}` },
    body: JSON.stringify({ from: config.from, to: [message.email], ...content }),
  });
  // Never log provider bodies (which can contain contacts or credentials).
  if (!response.ok) throw Error("Email provider rejected the request.");
  const result = await response.json() as { id?: unknown };
  if (typeof result.id !== "string" || !result.id || result.id.length > 200) throw Error("Email provider acceptance was not confirmed.");
  return result.id;
}

/** A separate worker sees committed appointments only. Claim commits before any
 * network call; the first-attempt timestamp survives a crash/ambiguous response.
 * Send holds message + appointment locks for at most five seconds, serializing
 * cancellation/reschedule and manual handling with the current revision.
 * Resend keys expire after 24h: never automatically retry beyond 23h or 3 tries.
 * `sent` means provider ACCEPTED, not delivered. Inbox/bounce verification is a
 * separate pilot gate. No worker/schedule is enabled by this implementation. */
export async function deliverBookingMessages(db: Database, config: DeliveryConfig, send: Sender = sendBookingEmail) {
  await reconcilePendingReceipts(db);
  const counts = { accepted: 0, failed: 0, manual: 0, superseded: 0 };
  for (let i = 0; i < 5; i++) {
    const claimed = await db.transaction(async tx => {
      const [m] = await tx.query<{ id: string; appointment_id: string; attempts: number; handled_at: Date | string | null }>(
        `SELECT id,appointment_id,attempts,handled_at FROM reserve_booking_messages
         WHERE state IN ('manual_required','failed') AND attempts<3 AND available_at<=now() AND created_at >= $1::timestamptz AND EXISTS (SELECT 1 FROM reserve_appointments a WHERE a.id=appointment_id AND a.provider_id='katie')
         ORDER BY available_at,id LIMIT 1 FOR UPDATE SKIP LOCKED`, [config.notBefore]);
      if (!m) return null;
      if (m.handled_at && Date.now() - new Date(m.handled_at).getTime() >= 23 * 3600000) {
        await tx.query("UPDATE reserve_booking_messages SET state='manual_required',attempts=3 WHERE id=$1", [m.id]);
        counts.manual++; return { expired: true, id: m.id, appointment_id: m.appointment_id, attempts: 3 };
      }
      await tx.query("UPDATE reserve_booking_messages m SET recipient_email=COALESCE(m.recipient_email,NULLIF(c.email,''),u.email) FROM reserve_appointments a LEFT JOIN reserve_clients c ON c.id=a.crm_client_id LEFT JOIN reserve_users u ON u.id=a.client_id WHERE m.id=$1 AND a.id=m.appointment_id", [m.id]);
      await tx.query("UPDATE reserve_booking_messages SET state='failed',attempts=attempts+1,handled_at=COALESCE(handled_at,now()),available_at=now()+interval '60 seconds' WHERE id=$1", [m.id]);
      return { expired: false, id: m.id, appointment_id: m.appointment_id, attempts: m.attempts + 1 };
    });
    if (!claimed) break;
    if (claimed.expired) continue;
    await db.transaction(async tx => {
      // Match booking mutation lock order: appointment first, then its messages.
      await tx.query("SELECT id FROM reserve_appointments WHERE id=$1 FOR UPDATE", [claimed.appointment_id]);
      const [m] = await tx.query<Message>(
        `SELECT m.*,a.revision AS appointment_revision,a.status,a.client_id,a.arrived_at,a.starts_at,a.ends_at,a.price,
         COALESCE(m.recipient_email,NULLIF(c.email,''),u.email) AS email,s.name AS service_name,p.name AS provider_name,
         COALESCE(l.timezone,'America/Chicago') AS timezone,COALESCE(l.address,'') AS address
         FROM reserve_booking_messages m JOIN reserve_appointments a ON a.id=m.appointment_id
         JOIN reserve_services s ON s.id=a.service_id JOIN reserve_providers p ON p.id=a.provider_id
         LEFT JOIN reserve_clients c ON c.id=a.crm_client_id LEFT JOIN reserve_users u ON u.id=a.client_id
         LEFT JOIN reserve_locations l ON l.id=a.location_id WHERE m.id=$1 FOR UPDATE OF m`, [claimed.id]);
      if (!m || m.state !== "failed" || m.attempts !== claimed.attempts) return;
      if (m.handled_at && Date.now() - new Date(m.handled_at).getTime() >= 23 * 3600000) {
        await tx.query("UPDATE reserve_booking_messages SET state='manual_required',attempts=3 WHERE id=$1", [m.id]);
        counts.manual++; return;
      }
      if ((m.kind === "reminder" && m.arrived_at) || m.revision !== m.appointment_revision || (m.kind === "cancel" ? m.status !== "cancelled" : m.status !== "confirmed") || (m.kind !== "cancel" && new Date(m.starts_at).getTime() <= Date.now())) {
        await tx.query("UPDATE reserve_booking_messages SET state='superseded' WHERE id=$1", [m.id]);
        counts.superseded++; return;
      }
      // Missing/unsafe addresses require Katie's manual follow-up, never guessing.
      if (!m.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email) || /\.(invalid|test|example)$/i.test(m.email)) {
        await tx.query("UPDATE reserve_booking_messages SET state='manual_required',attempts=3 WHERE id=$1", [m.id]);
        counts.manual++; return;
      }
      const [suppressed] = await tx.query("SELECT id FROM reserve_booking_messages WHERE lower(recipient_email)=lower($1) AND delivery_status IN ('bounced','complained','suppressed') AND id<>$2 LIMIT 1", [m.email,m.id]);
      if (suppressed) {
        await tx.query("UPDATE reserve_booking_messages SET state='manual_required',attempts=3,delivery_status='suppressed' WHERE id=$1", [m.id]);
        counts.manual++; return;
      }
      await tx.query("UPDATE reserve_booking_messages SET recipient_email=COALESCE(recipient_email,$2) WHERE id=$1", [m.id,m.email]);
      let providerId: string | void;
      try {
        providerId = await send(m, config);
      } catch {
        await tx.query("UPDATE reserve_booking_messages SET state=$2,available_at=now()+interval '5 minutes' WHERE id=$1", [m.id, m.attempts >= 3 ? "manual_required" : "failed"]);
        counts.failed++; return;
      }
      await tx.query("UPDATE reserve_booking_messages SET state='sent',provider_message_id=$2,accepted_at=COALESCE(accepted_at,now()),delivery_status=COALESCE(delivery_status,'accepted') WHERE id=$1", [m.id,providerId || null]);
      if (providerId) await reconcileReceipt(tx,providerId);
      counts.accepted++;
    });
  }
  return counts;
}
