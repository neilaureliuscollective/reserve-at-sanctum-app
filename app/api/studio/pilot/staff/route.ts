import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { BookingError } from "@/lib/booking";
import { failure, mutationOrigin } from "@/lib/http";
import { readChairJson } from "@/lib/chair-http";
import { configurePilotStaff } from "@/lib/booking-pilot";
export async function POST(req: Request) {
  try {
    mutationOrigin(req);
    const actor = await currentUser();
    if (!actor) throw new BookingError("Sign in to Studio.", 401);
    await configurePilotStaff(
      await database(),
      actor,
      await readChairJson(req),
    );
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
