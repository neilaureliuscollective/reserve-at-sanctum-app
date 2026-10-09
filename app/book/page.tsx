import { isPreview } from "@/lib/db";
import { BookingFlow } from "@/components/booking-flow";

export const metadata = { title: "Book a visit" };
export default function Page() {
  return (
    <main id="main" className="inner-page section booking-page">
      <p className="experience-kicker booking-channel">
        LEGACY RESERVE · APPOINTMENTS
      </p>
      <BookingFlow preview={isPreview()} />
    </main>
  );
}
