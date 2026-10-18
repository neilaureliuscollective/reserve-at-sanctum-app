import type { Queryable } from "./db";
/** Katie’s public booking/payment destination. Never append native service IDs. */
export const fixItPublicBooking = {
  href: "https://fixitshop.glossgenius.com/",
  label: "Book on GlossGenius",
  status: "View Katie’s current services, prices and available times on GlossGenius. Appointments and payments are handled there.",
} as const;

/** Shared directories retain every other professional’s native destination. */
export function publicBookingHref(providerId: string, nativeHref: string) {
  return providerId === "katie" ? fixItPublicBooking.href : nativeHref;
}

export async function isKatiePublicBookingRequest(
  query: { provider?: string; service?: string; location?: string },
  db?: Queryable,
) {
  // An explicit other professional always wins over a mismatched service ID.
  if (query.provider) return query.provider === "katie";
  if (query.service) {
    if (!db) return false;
    const [row] = await db.query<{provider_id: string}>(
      "SELECT provider_id FROM reserve_services WHERE id=$1", [query.service],
    );
    return row?.provider_id === "katie";
  }
  return !query.location || query.location === "eunice";
}
