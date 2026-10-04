import { z } from "zod";
import { authenticated, rateLimit } from "@/lib/operation-http";
import { customers, createCustomer } from "@/domains/customers";
import { failure, mutationOrigin } from "@/lib/http";
import { readChairJson } from "@/lib/chair-http";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const { db, actor } = await authenticated();
    const p = new URL(req.url).searchParams;
    return Response.json({
      customers: await customers(
        db,
        actor,
        p.get("location") || "",
        p.get("provider") || "",
        p.get("q") || "",
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
    await rateLimit(`customers:${actor.id}`);
    const raw = z
      .object({
        locationId: z.string().max(100),
        providerId: z.string().max(100),
        name: z.string(),
        email: z.string().default(""),
        phone: z.string().default(""),
      })
      .strict()
      .parse(await readChairJson(req));
    const { locationId, providerId, ...input } = raw;
    return Response.json({
      customer: await createCustomer(db, actor, locationId, providerId, input),
    });
  } catch (e) {
    return failure(e);
  }
}
