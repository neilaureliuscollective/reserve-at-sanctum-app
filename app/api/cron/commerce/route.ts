import { timingSafeEqual } from "node:crypto";
import { database } from "@/lib/db";
import { processEvents } from "@/domains/commerce/payments";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const secret = process.env.RESERVE_CRON_SECRET;
  const a = Buffer.from(req.headers.get("authorization") || ""),
    b = Buffer.from(`Bearer ${secret}`);
  if (!secret || a.length !== b.length || !timingSafeEqual(a, b))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return Response.json({ results: await processEvents(await database()) });
  } catch {
    return Response.json({ error: "Worker unavailable" }, { status: 503 });
  }
}
