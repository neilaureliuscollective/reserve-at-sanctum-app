import { authenticated, rateLimit } from "@/lib/operation-http";
import {
  configuration,
  configure,
  operatorLocations,
} from "@/domains/operations/configuration";
import { failure, mutationOrigin } from "@/lib/http";
import { readChairJson } from "@/lib/chair-http";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const { db, actor } = await authenticated();
    const location = new URL(req.url).searchParams.get("location");
    return Response.json(
      location
        ? await configuration(db, actor, location)
        : {
            locations: await operatorLocations(db, actor),
            assignments: actor.assignments,
          },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    mutationOrigin(req);
    const { db, actor } = await authenticated();
    await rateLimit(`configuration:${actor.id}`);
    return Response.json(
      await configure(db, actor, await readChairJson(req, 16000)),
    );
  } catch (e) {
    return failure(e);
  }
}
