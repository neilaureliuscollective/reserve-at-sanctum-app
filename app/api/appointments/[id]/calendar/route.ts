import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { BookingError, canAccess, type Appointment } from "@/lib/booking";
import { failure } from "@/lib/http";
import { z } from "zod";
const escape = (s: string) =>
  s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/[,;]/g, (c) => "\\" + c)
    .replace(/\r/g, "");
const stamp = (s: string | Date) =>
  new Date(s)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await currentUser();
    if (!actor) throw new BookingError("Sign in to your appointments.", 401);
    const { id } = await params;
    z.uuid().parse(id);
    const [a] = await (
      await database()
    ).query<Appointment & { address: string }>(
      "SELECT a.*,s.name AS service_name,l.address FROM reserve_appointments a JOIN reserve_services s ON s.id=a.service_id LEFT JOIN reserve_locations l ON l.id=a.location_id WHERE a.id=$1",
      [id],
    );
    if (!a || !canAccess(actor, a))
      throw new BookingError("Appointment not found.", 404);
    const content = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Legacy Reserve//Appointments//EN",
      "BEGIN:VEVENT",
      "UID:" + a.id + "@reserveatsanctum.app",
      "SEQUENCE:" + a.revision,
      "DTSTAMP:" + stamp(new Date()),
      "DTSTART:" + stamp(a.starts_at),
      "DTEND:" + stamp(a.ends_at),
      "SUMMARY:" + escape(a.service_name || "Legacy Reserve appointment"),
      "LOCATION:" + escape(a.address || ""),
      "STATUS:" + (a.status === "cancelled" ? "CANCELLED" : "CONFIRMED"),
      "END:VEVENT",
      "END:VCALENDAR",
      "",
    ].join("\r\n");
    return new Response(content, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="appointment.ics"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
