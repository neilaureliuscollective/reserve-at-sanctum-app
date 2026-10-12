import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { BookingError } from "@/lib/booking";
import { failure, mutationOrigin } from "@/lib/http";
import { readChairJson } from "@/lib/chair-http";
import { bookingMessages, confirmManualMessage, bookingDeliveryHistory } from "@/lib/booking-pilot";
export const dynamic = "force-dynamic";
async function actor() {
  const a = await currentUser();
  if (!a) throw new BookingError("Sign in to Studio.", 401);
  return a;
}
export async function GET() {
  try {
    const user = await actor(), db = await database();
    const [messages, delivery] = await Promise.all([bookingMessages(db,user),bookingDeliveryHistory(db,user)]);
    return Response.json(
      { messages, delivery },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(req: Request) {
  try {
    mutationOrigin(req);
    const { id } = z
      .object({ id: z.uuid() })
      .strict()
      .parse(await readChairJson(req));
    await confirmManualMessage(await database(), await actor(), id);
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
