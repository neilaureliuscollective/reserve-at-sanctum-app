import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { BookingError } from "@/lib/booking";
import { providerDay } from "@/lib/provider-day";
import { failure } from "@/lib/http";
import { katieNativeBooking } from "@/lib/katie-launch";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const actor = await currentUser();
    if (!actor) throw new BookingError("Sign in to Studio.", 401);
    const p = new URL(req.url).searchParams;
    const day = await providerDay(await database(), actor, {
      provider: p.get("provider") || undefined,
      location: p.get("location") || undefined,
      date: p.get("date") || undefined,
      service: p.get("service") || undefined,
    });
    if (day.provider.id === "katie" && !katieNativeBooking()) {
      day.slots = [];
      day.slotState = "closed";
    }
    return Response.json(
      day,
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    const response = failure(e);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
}
