import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { change, BookingError } from "@/lib/booking";
import { mutationOrigin, failure } from "@/lib/http";
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    mutationOrigin(req);
    const actor = await currentUser();
    if (!actor) throw new BookingError("Please sign in.", 401);
    const { id } = await params;
    z.uuid().parse(id);
    const input = z
      .object({
        action: z.enum(["cancel", "reschedule"]),
        start: z.iso.datetime().optional(),
        revision: z.number().int().positive(),
      })
      .parse(await req.json());
    return Response.json({
      appointment: await change(await database(), actor, id, input),
    });
  } catch (e) {
    return failure(e);
  }
}
