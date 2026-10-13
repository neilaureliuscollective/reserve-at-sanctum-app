/** Explicit calendar-of-record cutover. Synthetic local previews are isolated.
 * A temporary native outage must never reopen a second booking calendar. */
export const katieExternalBooking = "https://fixitshop.glossgenius.com/";
export function katieNativeBooking(env: Record<string, string | undefined> = process.env) {
  // An explicit closed calendar also wins in isolated acceptance fixtures.
  if (env.RESERVE_KATIE_CALENDAR === "glossgenius") return false;
  if (env.NODE_ENV !== "production" && !env.DATABASE_URL && env.RESERVE_DEV_PREVIEW === "true") return true;
  return env.RESERVE_KATIE_CALENDAR === "native";
}
