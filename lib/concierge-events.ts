import { z } from "zod";
import type { Queryable } from "./db";
/** Aggregate only. No user IDs, prompts, product IDs, cart IDs or paid-order claims. */
export const conciergeEvents = ["concierge_opened", "shopping_conversation_started", "product_recommended", "product_clicked", "cart_prepared", "checkout_initiated", "checkout_handoff_completed"] as const;
export type ConciergeEvent = typeof conciergeEvents[number];
export const browserConciergeEvent = z.object({ event: z.enum(["concierge_opened", "product_clicked"]) }).strict();
export async function conciergeEvent(db: Queryable, event: ConciergeEvent, count = 1) {
  try {
    // Reuse the existing private daily aggregate infrastructure with a distinct namespace.
    await db.query(`INSERT INTO reserve_chair_funnel(day,event,total) VALUES(current_date,$1,$2)
      ON CONFLICT(day,event) DO UPDATE SET total=reserve_chair_funnel.total+excluded.total`, [`aethelios:${event}`, count]);
  } catch { /* Analytics must never prevent shopping or verified tools. */ }
}
