import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { BookingError } from "@/lib/booking";
import { mutationOrigin, failure } from "@/lib/http";
export async function POST(req: Request) {
  try {
    mutationOrigin(req);
    const actor = await currentUser();
    if (!actor || actor.role !== "client")
      throw new BookingError("Client sign-in is required.", 401);
    const { locationId } = z
      .object({ locationId: z.string().min(1).max(80) })
      .strict()
      .parse(await req.json());
    const db = await database();
    await db.transaction(async (tx) => {
      const [house] = await tx.query(
        "SELECT id FROM reserve_locations WHERE id=$1 AND enabled=true FOR SHARE",
        [locationId],
      );
      if (!house) throw new BookingError("This location is not available.");
      await tx.query(
        "UPDATE reserve_users SET preferred_location_id=$1 WHERE id=$2",
        [locationId, actor.id],
      );
    });
    return Response.json(
      { saved: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
