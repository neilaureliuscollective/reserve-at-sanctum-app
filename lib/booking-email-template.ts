import { DateTime } from "luxon";
export const bookingEmailKinds=["booked","reschedule","cancel","reminder"] as const;
export type BookingEmailKind=(typeof bookingEmailKinds)[number];
export type BookingEmailContent={
  kind: string;
  starts_at: Date|string;
  ends_at: Date|string;
  timezone: string;
  price: number;
  provider_name: string;
  service_name: string;
  address: string;
  accountLinked: boolean;
};
/** The delivery worker and synthetic previews render the same content. No contacts or private notes. */
export function renderBookingEmail(message: BookingEmailContent,origin: string) {
  const when=DateTime.fromJSDate(new Date(message.starts_at)).setZone(message.timezone);
  if(!when.isValid)
    throw Error("Invalid appointment timezone.");
  const title=({ booked: "Appointment confirmed",reschedule: "Appointment rescheduled",cancel: "Appointment cancelled",reminder: "Appointment reminder" } as Record<string,string>)[message.kind];
  const text=[title,`Fix It Shop · ${message.provider_name}`,message.service_name,
    when.toFormat("cccc, LLLL d, yyyy 'at' h:mm a ZZZZ"),
    `${Math.round((new Date(message.ends_at).getTime()-new Date(message.starts_at).getTime())/60000)} minutes · $${(message.price/100).toFixed(2)}`,
    message.address,message.accountLinked? `View your appointments: ${origin}/fix-it-shop/app/appointments`:`For changes, contact ${message.provider_name} using your usual contact method.`,
    "Powered by Aethelios Booking"].filter(Boolean).join("\n");
  if(!title)
    throw Error("Unsupported booking email kind.");
  return { subject: `Fix It Shop — ${title}`,text };
}
