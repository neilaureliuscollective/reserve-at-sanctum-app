import { timingSafeEqual } from "node:crypto";
export type DeliveryConfig = { key: string; from: string; origin: string; secret: string; notBefore: string };
export function deliveryConfig(env: Record<string, string | undefined> = process.env): DeliveryConfig | null {
  if (env.RESERVE_BOOKING_EMAIL_ENABLED !== "true") return null;
  const { RESEND_API_KEY: key, RESERVE_BOOKING_EMAIL_FROM: from, APP_ORIGIN: origin, CRON_SECRET: secret, RESERVE_BOOKING_EMAIL_NOT_BEFORE: notBefore } = env;
  if (!key || !from || !origin || !secret || secret.length < 32 || !notBefore || !/^\d{4}-\d{2}-\d{2}T.*Z$/.test(notBefore) || !Number.isFinite(Date.parse(notBefore))) throw Error("Booking email configuration is incomplete.");
  const url = new URL(origin);
  if (url.protocol !== "https:" || url.origin !== origin) throw Error("Booking email requires an exact HTTPS application origin.");
  if (/[\r\n]/.test(from)) throw Error("Invalid booking sender.");
  return { key, from, origin, secret, notBefore };
}
export function deliveryAuthorized(header: string | null, secret: string) {
  const supplied = Buffer.from(header || ""), expected = Buffer.from(`Bearer ${secret}`);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

