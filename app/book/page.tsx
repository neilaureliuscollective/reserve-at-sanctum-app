export const dynamic = "force-dynamic";
import { isPreview } from "@/lib/db";
import { BookingFlow } from "@/components/booking-flow";
import { katieNativeBooking } from "@/lib/katie-launch";

export const metadata = { title: "Book a visit" };
export default function Page() {
  return (
    <main id="main" className="inner-page section booking-page">
      <p className="experience-kicker booking-channel">
        FIX IT SHOP · APPOINTMENTS
      </p>
      <BookingFlow preview={isPreview()} nativeKatieCalendar={katieNativeBooking()} />
    </main>
  );
}
