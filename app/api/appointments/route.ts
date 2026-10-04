import {rateLimit} from "@/lib/operation-http";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { book, visits, BookingError } from "@/lib/booking";
import { mutationOrigin, failure } from "@/lib/http";
import { readChairJson } from "@/lib/chair-http";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const actor = await currentUser();
    if (!actor) throw new BookingError("Sign in to view your visits.", 401);
    const params=new URL(req.url).searchParams;
    return Response.json({
      visits: await visits(
        await database(),
        actor,
        params.get("studio") === "true",
        {locationId:params.get('location')||undefined,providerId:params.get('provider')||undefined,date:params.get('date')||undefined,cursor:params.get('cursor')||undefined},
      ),
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    mutationOrigin(req);
    const actor = await currentUser();
    if (!actor)
      throw new BookingError("Sign in before reserving a visit.", 401);
    await rateLimit(`booking:${actor.id}`,20);
    const input = z
      .object({
        serviceId: z.string().max(80),
        start: z.iso.datetime(),
        note: z.string().max(600).default(""),
        requestKey: z.uuid(),
        customerId: z.string().max(100).optional(),
      })
      .strict().parse(await readChairJson(req,16000));
    return Response.json(
      { appointment: await book(await database(), actor, input) },
      { status: 201 },
    );
  } catch (e) {
    return failure(e);
  }
}
