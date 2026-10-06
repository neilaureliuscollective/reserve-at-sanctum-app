/** Server-only Square configuration. Never import from client components. */

export const SQUARE_API_VERSION = process.env.SQUARE_API_VERSION || "2026-09-16";

export type SquareEnvironment = "sandbox" | "production";

export type SquareConfig = {
  environment: SquareEnvironment;
  accessToken: string;
  applicationId: string;
  webhookSignatureKey: string;
  webhookNotificationUrl: string;
  defaultLocationId: string;
  apiVersion: string;
  baseUrl: string;
  enabled: boolean;
  webhooksEnabled: boolean;
  bookingsEnabled: boolean;
};

function read(name: string) {
  return process.env[name]?.trim() || "";
}

export function squareEnvironment(): SquareEnvironment {
  return read("SQUARE_ENVIRONMENT").toLowerCase() === "production"
    ? "production"
    : "sandbox";
}

export function squareConfig(): SquareConfig {
  const environment = squareEnvironment();
  const accessToken = read("SQUARE_ACCESS_TOKEN");
  const webhookSignatureKey = read("SQUARE_WEBHOOK_SIGNATURE_KEY");
  const origin = read("APP_ORIGIN").replace(/\/$/, "");
  const webhookNotificationUrl =
    read("SQUARE_WEBHOOK_NOTIFICATION_URL") ||
    (origin ? `${origin}/api/webhooks/square` : "");
  return {
    environment,
    accessToken,
    applicationId: read("SQUARE_APPLICATION_ID"),
    webhookSignatureKey,
    webhookNotificationUrl,
    defaultLocationId: read("SQUARE_LOCATION_ID"),
    apiVersion: read("SQUARE_API_VERSION") || SQUARE_API_VERSION,
    baseUrl:
      environment === "production"
        ? "https://connect.squareup.com"
        : "https://connect.squareupsandbox.com",
    enabled: Boolean(accessToken),
    webhooksEnabled: Boolean(webhookSignatureKey && webhookNotificationUrl),
    bookingsEnabled:
      Boolean(accessToken) && read("SQUARE_BOOKINGS_ENABLED") === "true",
  };
}

/** Safe for UI and tests. Never includes tokens or signature keys. */
export function squarePublicStatus() {
  const config = squareConfig();
  return {
    provider: "square" as const,
    enabled: config.enabled,
    environment: config.enabled ? config.environment : null,
    webhooks: config.webhooksEnabled,
    bookings: config.bookingsEnabled,
    catalog: config.enabled,
    subscriptions: config.enabled,
    payments: config.enabled,
  };
}
