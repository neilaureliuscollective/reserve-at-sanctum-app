import type { Database, Queryable, Row } from "./db";
import type { Actor } from "./booking";

export type SavedBooking = Row & {
  id: string; starts_at: string; ends_at: string; price: number; status: string;
  service_name: string; provider_name: string; timezone: string;
};
export type BookingNotification = "queued" | "accepted" | "delivered" | "attention" | "unavailable";

/** Minimal customer evidence only. Never expose recipient/contact or provider IDs. */
export async function bookingNotification(db: Queryable, appointmentId: string): Promise<BookingNotification> {
  try {
    const [message] = await db.query<{state:string;delivery_status:string|null}>(
      `SELECT m.state,m.delivery_status FROM reserve_booking_messages m
       JOIN reserve_appointments a ON a.id=m.appointment_id
       WHERE m.appointment_id=$1 AND m.revision=a.revision AND m.kind IN ('booked','reschedule','cancel')
       ORDER BY m.created_at DESC,m.id LIMIT 1`, [appointmentId]);
    if (!message) return "unavailable";
    if (["bounced", "complained", "suppressed", "failed", "delayed"].includes(message.delivery_status || "") || message.state === "failed") return "attention";
    if (message.delivery_status === "delivered") return "delivered";
    if (message.state === "sent" || message.delivery_status === "accepted") return "accepted";
    if (message.state === "manual_required") return "queued";
    return "unavailable";
  } catch { return "unavailable"; }
}

/** Serialize with book() on the existing account row. If nothing committed,
 * leave a private tombstone so an in-flight/delayed POST cannot commit later.
 * No draft, note or contact data is persisted. Safe to repeat after response loss.
 * Retain fences: deleting one would make an old client request valid again. */
export async function recoverBooking(db: Database, actor: Actor, requestKey: string) {
  const appointment = await db.transaction(async tx => {
    await tx.query("SELECT id FROM reserve_users WHERE id=$1 FOR UPDATE", [actor.id]);
    const [saved] = await tx.query<SavedBooking>(`SELECT a.id,a.starts_at,a.ends_at,a.price,a.status,
      s.name AS service_name,p.name AS provider_name,COALESCE(l.timezone,'America/Chicago') AS timezone
      FROM reserve_appointments a JOIN reserve_services s ON s.id=a.service_id
      JOIN reserve_providers p ON p.id=a.provider_id LEFT JOIN reserve_locations l ON l.id=a.location_id
      WHERE a.client_id=$1 AND a.request_key=$2 AND a.source='online'`, [actor.id, requestKey]);
    if (saved) return saved;
    await tx.query("INSERT INTO reserve_booking_request_fences(client_id,request_key) VALUES($1,$2) ON CONFLICT DO NOTHING", [actor.id, requestKey]);
    return null;
  });
  return { appointment, notification: appointment ? await bookingNotification(db, appointment.id) : null };
}
