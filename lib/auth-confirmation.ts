import { requireFeatureSchema } from "./feature-readiness";
import { createHash } from "node:crypto";
import type { Database } from "./db";
import { BookingError } from "./booking-error";
import { safeDestination } from "./experience/entry";
export const confirmationMessage =
  "If this address needs confirmation, an email has been requested. Open the latest link in this same browser. You can request another link in a minute.";
export function appOrigin(
  env: Record<string, string | undefined> = process.env,
) {
  let url: URL;
  try {
    url = new URL(env.APP_ORIGIN || "");
  } catch {
    throw new BookingError("Application origin is not configured.", 503);
  }
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    (!["https:"].includes(url.protocol) &&
      !(
        env.NODE_ENV !== "production" &&
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      ))
  )
    throw new BookingError("Application origin is not configured safely.", 503);
  return url.origin;
}
export function confirmationRedirect(
  next: unknown,
  env: Record<string, string | undefined> = process.env,
) {
  return new URL(
    "/auth/callback?next=" +
      encodeURIComponent(
        safeDestination(typeof next === "string" ? next : null),
      ),
    appOrigin(env),
  ).toString();
}
/** Atomic shared budget: one request/address/minute and a global cap. Supabase
 * also enforces project/IP limits. Do not trust client-supplied forwarding IPs. */
export async function reserveAuthDelivery(db: Database, email: string) {
  await requireFeatureSchema(db, "authDelivery");
  return db.transaction(async (tx) => {
    await tx.query(
      "DELETE FROM reserve_auth_delivery_limits WHERE window_start<now()-interval '1 day'",
    );
    for (const [key, limit] of [
      ["global", 30],
      ["email:" + email.trim().toLowerCase(), 1],
    ] as const) {
      const hash = createHash("sha256").update(key).digest("hex");
      const rows = await tx.query(
        `INSERT INTO reserve_auth_delivery_limits(key_hash) VALUES($1)
    ON CONFLICT(key_hash) DO UPDATE SET attempts=CASE WHEN reserve_auth_delivery_limits.window_start<now()-interval '1 minute' THEN 1 ELSE reserve_auth_delivery_limits.attempts+1 END,
    window_start=CASE WHEN reserve_auth_delivery_limits.window_start<now()-interval '1 minute' THEN now() ELSE reserve_auth_delivery_limits.window_start END
    WHERE reserve_auth_delivery_limits.window_start<now()-interval '1 minute' OR reserve_auth_delivery_limits.attempts<$2 RETURNING key_hash`,
        [hash, limit],
      );
      if (!rows.length) return false;
    }
    return true;
  });
}
