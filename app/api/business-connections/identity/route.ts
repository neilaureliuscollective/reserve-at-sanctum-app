import { businessActor, businessFailure } from "@/lib/business-token";
import { businessIdentity } from "@/lib/business-connections";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const { db, grant } = await businessActor(req);
    return Response.json(await businessIdentity(db, grant), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return businessFailure(e);
  }
}
