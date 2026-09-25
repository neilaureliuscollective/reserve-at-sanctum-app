import { SHARED_AUTH_PROJECT_REF } from "./supabase-config";

// Copy the transaction-pooler connection from the project's Connect panel.
// The cluster index cannot be reliably inferred from the region.
export function serverlessDatabaseUrl(value: string, production = process.env.NODE_ENV === "production") {
  const url = new URL(value);
  if (production &&
    (!url.hostname.endsWith(".pooler.supabase.com") ||
      url.port !== "6543" ||
      url.username !== `reserve_app.${SHARED_AUTH_PROJECT_REF}` ||
      !url.password)) {
    throw new Error("Reserve requires its shared project's transaction pooler connection.");
  }
  return value;
}
