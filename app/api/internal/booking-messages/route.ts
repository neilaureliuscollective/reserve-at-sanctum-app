import { database } from "@/lib/db";
import { deliveryAuthorized, deliveryConfig, deliverBookingMessages } from "@/lib/booking-delivery";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const config = deliveryConfig();
    if (!config) return Response.json({ status: "disabled" }, { status: 503, headers });
    if (!deliveryAuthorized(request.headers.get("authorization"), config.secret))
      return Response.json({ error: "Unauthorized" }, { status: 401, headers });
    return Response.json(await deliverBookingMessages(await database(), config), { headers });
  } catch {
    console.error("Booking message processing unavailable");
    return Response.json({ error: "Processing unavailable" }, { status: 503, headers });
  }
}
