import { BookingFlow } from "@/components/booking-flow";
import { isPreview } from "@/lib/db";
import { fixItBooking } from "@/lib/fix-it-booking";
import { katieNativeBooking } from "@/lib/katie-launch";
export const metadata = { title: "Book with Katie" };
export default function Page() {
  return (
    <main id="main" className="fix-it-content booking-page">
      <BookingFlow preview={isPreview()} identity={fixItBooking} nativeKatieCalendar={katieNativeBooking()} />
    </main>
  );
}
