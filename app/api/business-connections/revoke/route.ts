import { businessActor, businessFailure } from "@/lib/business-token";
import { revokeBusiness } from "@/lib/business-connections";
export const dynamic = "force-dynamic";
// Bearer + per-link proof; no cookies/CORS or origin fallback on delegated endpoint.
export async function POST(req: Request) {
  try {
    const { db, actor, grant } = await businessActor(req);
    await revokeBusiness(db, actor, grant.id);
    return Response.json(
      { revoked: true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return businessFailure(e);
  }
}
