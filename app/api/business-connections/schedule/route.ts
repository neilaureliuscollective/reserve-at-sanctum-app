import { businessActor, businessFailure } from "@/lib/business-token";
import { businessSchedule } from "@/lib/business-connections";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const { db, actor, grant } = await businessActor(req);
    const query = Object.fromEntries(new URL(req.url).searchParams);
    return Response.json(await businessSchedule(db, actor, grant, query), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return businessFailure(e);
  }
}
