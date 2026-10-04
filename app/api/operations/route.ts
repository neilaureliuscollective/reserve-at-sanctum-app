import { requireLegacyRegister } from "@/domains/shopify/mode";
import { authenticated, rateLimit } from "@/lib/operation-http";
import { collect, reconciliation } from "@/domains/collections";
import { failure, mutationOrigin } from "@/lib/http";
import { readChairJson } from "@/lib/chair-http";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const { db, actor } = await authenticated();
    const p = new URL(req.url).searchParams;
    return Response.json({
      collections: await reconciliation(
        db,
        actor,
        p.get("location") || "",
        p.get("date") || "",
      ),
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    mutationOrigin(req);
    const { db, actor } = await authenticated();
    await rateLimit(`collection:${actor.id}`);
    const raw = await readChairJson(req);
    if (
      raw &&
      typeof raw === "object" &&
      "action" in raw &&
      raw.action === "record"
    )
      requireLegacyRegister();
    return Response.json(await collect(db, actor, raw));
  } catch (e) {
    return failure(e);
  }
}
