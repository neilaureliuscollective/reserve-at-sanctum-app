import type { Actor } from "./booking";
import type { Queryable } from "./db";
import { requireFounder, type Evidence } from "./founder-command";

async function read<T>(fn: () => Promise<T>): Promise<Evidence<T>> {
  try { return { available: true, data: await fn() }; }
  catch { return { available: false, data: null }; }
}

/** Aggregate operational evidence only. Never returns customer identities or notes. */
export async function founderOverview(db: Queryable, actor: Actor) {
  requireFounder(actor);
  const [bookings, professionals, businesses, health] = await Promise.all([
    read(async () => {
      const statuses = await db.query<{ status: string; count: number }>(
        "SELECT status,count(*)::int AS count FROM reserve_appointments GROUP BY status ORDER BY status");
      const [volume] = await db.query<{ total: number; last_30_days: number }>(
        "SELECT count(*)::int AS total,count(*) FILTER(WHERE created_at>=now()-interval '30 days')::int AS last_30_days FROM reserve_appointments");
      return { ...volume, statuses };
    }),
    read(async () => (await db.query<{ total: number; enabled: number; scoped_staff: number }>(
      "SELECT count(*)::int AS total,count(*) FILTER(WHERE enabled)::int AS enabled,(SELECT count(*)::int FROM reserve_users WHERE role IN ('operator','staff') AND provider_id IS NOT NULL) AS scoped_staff FROM reserve_providers"))[0]),
    read(async () => (await db.query<{ total: number; active: number; inactive: number }>(
      "SELECT count(*)::int AS total,count(*) FILTER(WHERE state='active')::int AS active,count(*) FILTER(WHERE state<>'active')::int AS inactive FROM reserve_businesses"))[0]),
    read(async () => {
      const rows = await db.query<{ table_name: string }>(
        "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('reserve_booking_receipts','reserve_booking_request_fences','reserve_businesses','reserve_business_memberships','reserve_support_cases','reserve_appointment_payment_links')");
      const present = new Set(rows.map(row => row.table_name));
      const required = ["reserve_booking_receipts", "reserve_booking_request_fences", "reserve_businesses", "reserve_business_memberships", "reserve_support_cases", "reserve_appointment_payment_links"];
      return { database: "Reachable" as const, missingTables: required.filter(name => !present.has(name)),
        release: process.env.VERCEL_GIT_COMMIT_SHA || null, environment: process.env.VERCEL_ENV || "local",
        businessAuthorityEnabled: process.env.RESERVE_BUSINESS_AUTHORITY_ENABLED === "true",
        paymentAssociationEnabled: process.env.RESERVE_PAYMENT_ASSOCIATION_ENABLED === "true" };
    }),
  ]);
  return { bookings, professionals, businesses, health, subscriptionRevenue: null };
}
export type FounderOverviewData = Awaited<ReturnType<typeof founderOverview>>;
