import { database, configured } from "@/lib/db";
import { availability, catalog } from "@/lib/booking";
import { failure } from "@/lib/http";
import { katieNativeBooking } from "@/lib/katie-launch";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    if (!configured())
      return Response.json({ services: [], slots: [], setupRequired: true, katieNativeCalendar: katieNativeBooking() });
    const db = await database(),
      u = new URL(req.url);
    if (!u.searchParams.has("service"))
      return Response.json({
        services: (await catalog(db, u.searchParams.get("location") ?? undefined)).filter(s => s.provider_id !== "katie" || katieNativeBooking()),
        katieNativeCalendar: katieNativeBooking(),
      });
    const services = await catalog(db, u.searchParams.get("location") ?? undefined);
    if (!katieNativeBooking() && services.some(s => s.id === u.searchParams.get("service") && s.provider_id === "katie"))
      return Response.json({ slots: [], error: "Book with Katie through her existing GlossGenius calendar. Native booking is not open." }, {status:503});
    return Response.json({
      slots: await availability(
        db,
        u.searchParams.get("service")!,
        u.searchParams.get("date") || "",
        undefined,
        u.searchParams.get("location") ?? undefined,
      ),
    });
  } catch (e) {
    return failure(e);
  }
}
