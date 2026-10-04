import { BookingError } from "../../lib/booking";
/** Shopify is the default commerce authority. The old register is a nonproduction audit/recovery surface only. */
export function legacyRegisterAllowed() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.RESERVE_LEGACY_COMMERCE_PREVIEW === "true"
  );
}
export function requireLegacyRegister() {
  if (!legacyRegisterAllowed())
    throw new BookingError(
      "Use Shopify POS for payments, refunds and inventory. The previous register is disabled.",
      409,
    );
}
