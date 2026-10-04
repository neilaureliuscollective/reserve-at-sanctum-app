import { DateTime } from "luxon";
import type { Database, Queryable, Row } from "../../lib/db";
import type { Actor } from "../../lib/booking";
import { BookingError } from "../../lib/booking";
import { requireAccess } from "../access";
export type Delivery = {
  id: string;
  to: string;
  subject: string;
  text: string;
};
export type Transport = (message: Delivery) => Promise<string>;
export async function emailTransport(message: Delivery) {
  if (!process.env.RESEND_API_KEY || !process.env.RESERVE_EMAIL_FROM)
    throw new Error("transport_unconfigured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": message.id,
    },
    body: JSON.stringify({
      from: process.env.RESERVE_EMAIL_FROM,
      to: [message.to],
      subject: message.subject,
      text: message.text,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`transport_${response.status}`);
  return (await response.json()).id as string;
}
export async function dispatch(
  db: Database,
  transport: Transport = emailTransport,
  limit = 20,
) {
  const claimed = await db.transaction((tx) =>
    tx.query<
      Row & {
        id: string;
        appointment_id: string;
        revision: number;
        kind: string;
      }
    >(
      `UPDATE reserve_outbox SET state='sending',locked_until=now()+interval '2 minutes',attempts=attempts+1
  WHERE id IN (SELECT id FROM reserve_outbox WHERE ((state IN ('pending','failed') AND due_at<=now()) OR (state='sending' AND locked_until<now())) AND attempts<5 ORDER BY due_at LIMIT $1 FOR UPDATE SKIP LOCKED) RETURNING *`,
      [Math.min(limit, 50)],
    ),
  );
  const results = [];
  for (const message of claimed) {
    try {
      const [visit] = await db.query<
        Row & {
          revision: number;
          status: string;
          email: string;
          starts_at: Date;
          timezone: string;
          contact: string;
          snapshot: { service: string; location: string; provider: string };
        }
      >(
        `SELECT a.*,c.email,l.timezone,l.contact FROM reserve_appointments a JOIN reserve_customers c ON c.id=a.customer_id JOIN reserve_locations l ON l.id=a.location_id WHERE a.id=$1`,
        [message.appointment_id],
      );
      if (
        visit.revision !== message.revision ||
        (message.kind === "reminder" && visit.status !== "confirmed")
      ) {
        await db.query(
          "UPDATE reserve_outbox SET state='suppressed',locked_until=NULL WHERE id=$1",
          [message.id],
        );
        results.push("suppressed");
        continue;
      }
      if (!visit.email) {
        await db.query(
          "UPDATE reserve_outbox SET state='manual',error_code='missing_email',locked_until=NULL WHERE id=$1",
          [message.id],
        );
        results.push("manual");
        continue;
      }
      const when = DateTime.fromJSDate(new Date(visit.starts_at))
        .setZone(visit.timezone)
        .toFormat("ccc, LLL d · h:mm a ZZZZ");
      const subject = `Reserve visit ${message.kind}`;
      const text = `${visit.snapshot.location}\n${visit.snapshot.service} with ${visit.snapshot.provider}\n${when}\nStatus: ${message.kind}\n${visit.contact}\nManage your visit: ${process.env.APP_ORIGIN || ""}/account`;
      const providerId = await transport({
        id: message.id,
        to: visit.email,
        subject,
        text,
      });
      await db.query(
        "UPDATE reserve_outbox SET state='sent',provider_id=$1,error_code=NULL,locked_until=NULL WHERE id=$2",
        [providerId, message.id],
      );
      results.push("sent");
    } catch (error) {
      const code =
        error instanceof Error && /^transport_\w+$/.test(error.message)
          ? error.message
          : "transport_failed";
      await db.query(
        "UPDATE reserve_outbox SET state='failed',error_code=$1,locked_until=NULL,due_at=now()+interval '5 minutes' WHERE id=$2",
        [code, message.id],
      );
      results.push("failed");
    }
  }
  return results;
}
export async function deliveryQueue(
  db: Queryable,
  actor: Actor,
  locationId: string,
) {
  requireAccess(actor, "manage", locationId);
  return db.query(
    `SELECT o.*,a.location_id,a.starts_at,c.name AS customer_name FROM reserve_outbox o JOIN reserve_appointments a ON a.id=o.appointment_id JOIN reserve_customers c ON c.id=a.customer_id WHERE a.location_id=$1 AND o.state IN ('failed','manual','pending','sending') ORDER BY o.due_at LIMIT 100`,
    [locationId],
  );
}
export async function retryDelivery(db: Database, actor: Actor, id: string) {
  return db.transaction(async (tx) => {
    const [row] = await tx.query<{ location_id: string; state: string }>(
      "SELECT a.location_id,o.state FROM reserve_outbox o JOIN reserve_appointments a ON a.id=o.appointment_id WHERE o.id=$1 FOR UPDATE OF o",
      [id],
    );
    if (!row) throw new BookingError("Delivery not found.", 404);
    requireAccess(actor, "manage", row.location_id);
    if (!["failed", "manual"].includes(row.state))
      throw new BookingError(
        "Only failed or manual deliveries can be retried.",
        409,
      );
    await tx.query(
      "UPDATE reserve_outbox SET state='pending',attempts=0,due_at=now(),error_code=NULL WHERE id=$1",
      [id],
    );
    await tx.query(
      "INSERT INTO reserve_operation_events(actor_id,location_id,entity_id,action) VALUES($1,$2,$3,'delivery_retried')",
      [actor.id, row.location_id, id],
    );
  });
}
