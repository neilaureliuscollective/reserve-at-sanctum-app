import { BookingFlow } from "@/components/booking-flow";
import { squareBookingsStatus } from "@/lib/square/bookings";
export const metadata = { title: "Book a visit" };
export default function Page() {
  const bookings = squareBookingsStatus();
  return (
    <main id="main" className="inner-page section booking-page">
      <p className="experience-kicker booking-channel">{bookings.note}</p>
      <BookingFlow />
    </main>
  );
}
