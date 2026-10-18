import { redirect } from "next/navigation";
import { fixItPublicBooking } from "@/lib/fix-it-public-booking";
import { BookingFlow } from "@/components/booking-flow";
import { isPreview } from "@/lib/db";
import { fixItBooking } from "@/lib/fix-it-booking";
export const metadata = { title: "Book with Katie" };
export default function Page() {
  // Keep the existing native engine reachable only in isolated synthetic preview.
  if (!isPreview()) redirect(fixItPublicBooking.href);
  return (
    <main id="main" className="fix-it-content booking-page">
      <BookingFlow preview={isPreview()} identity={fixItBooking} />
    </main>
  );
}
