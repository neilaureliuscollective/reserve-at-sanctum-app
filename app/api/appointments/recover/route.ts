import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { BookingError } from "@/lib/booking-error";
import { recoverBooking } from "@/lib/booking-recovery";
import { mutationOrigin, failure } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  try {
    mutationOrigin(req);
    const actor = await currentUser();
    if (!actor) throw new BookingError("Sign in to check your booking request.", 401);
    const { requestKey, actorId } = z.object({requestKey:z.uuid(),actorId:z.string().min(1).max(100)}).strict().parse(await req.json());
    if (actorId !== actor.id) throw new BookingError("Return to the account that submitted this booking request.", 403);
    return Response.json(await recoverBooking(await database(), actor, requestKey), {headers:{"Cache-Control":"no-store"}});
  } catch (e) { return failure(e); }
}
