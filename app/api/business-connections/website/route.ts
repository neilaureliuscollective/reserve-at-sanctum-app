import { businessActor, businessFailure } from "@/lib/business-token";
import { websiteSource, proposeWebsite } from "@/lib/business-websites";
import { readChairJson } from "@/lib/chair-http";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const { db, actor, grant } = await businessActor(req);
    return Response.json(await websiteSource(db, actor, grant), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return businessFailure(e);
  }
}
export async function POST(req: Request) {
  try {
    const { db, actor, grant } = await businessActor(req);
    return Response.json(
      await proposeWebsite(db, actor, grant, await readChairJson(req, 12000)),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return businessFailure(e);
  }
}
