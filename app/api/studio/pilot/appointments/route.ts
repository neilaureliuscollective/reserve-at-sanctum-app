import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { BookingError, availability } from "@/lib/booking";
import { failure, mutationOrigin } from "@/lib/http";
import { readChairJson } from "@/lib/chair-http";
import { manualAppointment, manualInput, providerScope } from "@/lib/booking-pilot";
import { katieNativeBooking } from "@/lib/katie-launch";
import { requireCapability } from "@/lib/studio-permissions";
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
    if (provider === "katie" && !katieNativeBooking())
      throw new BookingError("Katie’s calendar is on GlossGenius. Native new-visit availability is closed.", 503);
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
    const a = await actor(), input = manualInput.parse(await readChairJson(req));
    requireCapability(a, "appointments.manage");
    const provider = providerScope(a, input.provider);
    if (provider === "katie" && !katieNativeBooking())
      throw new BookingError("Katie’s calendar is on GlossGenius. Record new visits there until an approved native cutover.", 503);
    return Response.json(
      {
        appointment: await manualAppointment(
          await database(),
          a,
          input,
        ),
      },
      { status: 201 },
    );
  } catch (e) {
    return failure(e);
  }
}
