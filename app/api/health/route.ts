import { database } from "@/lib/db";
import { reserveRelease } from "@/lib/experience/release";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    // Validate the same transport and core tables used by customer and Studio
    // pages without returning identities, rows, credentials or infrastructure.
    const db = await database();
    await db.query("SELECT id FROM reserve_locations LIMIT 1");
    await db.query("SELECT id FROM reserve_users LIMIT 1");
    return Response.json({ status: "ready", release: reserveRelease }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    console.error("Reserve database readiness check failed");
    return Response.json({ status: "unavailable", release: reserveRelease }, {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }
}
