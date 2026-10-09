import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { BookingError, availability } from "@/lib/booking";
import { failure, mutationOrigin } from "@/lib/http";
import { readChairJson } from "@/lib/chair-http";
import { manualAppointment, providerScope } from "@/lib/booking-pilot";
export const dynamic = "force-dynamic";
async function actor() {
  const a = await currentUser();
  if (!a) throw new BookingError("Sign in to Studio.", 401);
  return a;
}
export async function GET(req: Request) {
  try {
    const a = await actor(),
      p = new URL(req.url).searchParams,
      db = await database();
    const provider = providerScope(a, p.get("provider") || undefined);
    const [s] = await db.query(
      "SELECT provider_id FROM reserve_services WHERE id=$1",
      [p.get("service")],
    );
    if (s?.provider_id !== provider)
      throw new BookingError("Service unavailable.", 404);
    return Response.json(
      {
        slots: await availability(
          db,
          z.string().min(1).parse(p.get("service")),
          p.get("date") || "",
          undefined,
          p.get("location") || undefined,
          true,
        ),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    mutationOrigin(req);
    return Response.json(
      {
        appointment: await manualAppointment(
          await database(),
          await actor(),
          await readChairJson(req),
        ),
      },
      { status: 201 },
    );
  } catch (e) {
    return failure(e);
  }
}
