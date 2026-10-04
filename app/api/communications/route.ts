import { z } from "zod";
import { authenticated } from "@/lib/operation-http";
import { deliveryQueue, retryDelivery } from "@/domains/communications";
import { failure, mutationOrigin } from "@/lib/http";
import { readChairJson } from "@/lib/chair-http";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const { db, actor } = await authenticated();
    return Response.json({
      deliveries: await deliveryQueue(
        db,
        actor,
        new URL(req.url).searchParams.get("location") || "",
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
    const { id } = z
      .object({ id: z.uuid() })
      .strict()
      .parse(await readChairJson(req));
    await retryDelivery(db, actor, id);
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
