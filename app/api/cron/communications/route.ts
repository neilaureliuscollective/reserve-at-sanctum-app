import { timingSafeEqual } from "node:crypto";
import { database } from "@/lib/db";
import { dispatch } from "@/domains/communications";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const expected = process.env.RESERVE_CRON_SECRET,
    actual = req.headers.get("authorization") || "";
  if (
    !expected ||
    actual.length !== expected.length + 7 ||
    !timingSafeEqual(Buffer.from(actual), Buffer.from(`Bearer ${expected}`))
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ results: await dispatch(await database()) });
}
