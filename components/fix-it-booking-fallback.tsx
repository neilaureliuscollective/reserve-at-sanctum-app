import { katieExternalBooking } from "@/lib/katie-launch";
export function FixItBookingFallback({ nativeCalendar = false }: { nativeCalendar?: boolean }) {
  return <section className="inline-note booking-status-panel" aria-label="Katie’s booking information">
    <h2>{nativeCalendar ? "Booking is temporarily unavailable." : "Book with Katie on GlossGenius."}</h2>
    <p>{nativeCalendar
      ? "Your existing Aethelios Booking appointments remain saved here. Check your appointments before trying again. Contact Katie through her existing site for help; do not make a second reservation for the same visit."
      : "GlossGenius is Katie’s current booking calendar. Native booking here is not open. View her current services and available times on her existing site."}</p>
    <a className="button button-gold" href={katieExternalBooking}>{nativeCalendar ? "Contact Katie through her existing site" : "Continue to GlossGenius"} ↗</a>
  </section>;
}
