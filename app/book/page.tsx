import { BookingFlow } from "@/components/booking-flow";
export const metadata = { title: "Book a visit" };
export default function Page() {
  return (
    <main id="main" className="inner-page section booking-page">
      <BookingFlow />
    </main>
  );
}
