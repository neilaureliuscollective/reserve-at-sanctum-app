import { z } from "zod";
import { authenticated, rateLimit } from "@/lib/operation-http";
import { claimCustomer, inviteCustomer } from "@/domains/customers";
import { failure, mutationOrigin } from "@/lib/http";
import { readChairJson } from "@/lib/chair-http";
export async function POST(req: Request) {
  try {
    mutationOrigin(req);
    const { db, actor } = await authenticated();
    await rateLimit(`claims:${actor.id}`, 10);
    const input = z
      .discriminatedUnion("action", [
        z
          .object({
            action: z.literal("invite"),
            customerId: z.string().max(100),
            locationId: z.string().max(100),
          })
          .strict(),
        z
          .object({ action: z.literal("claim"), token: z.string().max(64) })
          .strict(),
      ])
      .parse(await readChairJson(req));
    if (input.action === "invite")
      return Response.json(
        await inviteCustomer(db, actor, input.customerId, input.locationId),
      );
    await claimCustomer(db, actor, input.token);
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
