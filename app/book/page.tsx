import { redirect } from "next/navigation";
import { fixItPublicBooking, isKatiePublicBookingRequest } from "@/lib/fix-it-public-booking";
import { configured, database, isPreview } from "@/lib/db";
import { BookingFlow } from "@/components/booking-flow";

export const metadata = { title: "Book a visit" };
export default async function Page({ searchParams }: {
  searchParams: Promise<{ provider?: string; service?: string; location?: string }>;
}) {
  const query = await searchParams;
  if (!isPreview()) {
    const db = !query.provider && query.service && configured() ? await database() : undefined;
    if (await isKatiePublicBookingRequest(query, db)) redirect(fixItPublicBooking.href);
  }
  return (
    <main id="main" className="inner-page section booking-page">
      <p className="experience-kicker booking-channel">
        FIX IT SHOP · APPOINTMENTS
      </p>
      <BookingFlow preview={isPreview()} />
    </main>
  );
}
