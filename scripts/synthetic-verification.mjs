import { loadEnvFile } from "node:process";
// Match Next development precedence so credentials in a local env file cannot
// bypass a verification script's check and silently reach a hosted database.
export function assertSyntheticVerification() {
  for (const file of [".env.development.local", ".env.local", ".env.development", ".env"]) {
    try { loadEnvFile(file); } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  if (process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NODE_ENV === "production" || process.env.RESERVE_BOOKING_EMAIL_ENABLED === "true")
    throw Error("Verification requires an isolated synthetic environment with no hosted database/Auth and booking email disabled.");
}
