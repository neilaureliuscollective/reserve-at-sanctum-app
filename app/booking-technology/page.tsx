import Link from "next/link";
import { bookingBrand } from "@/lib/booking-brand";
export const metadata = { title: "Powered by Aethelios Booking" };
export default function Technology() {
 return <main id="main" className="inner-page section">
   <p className="eyebrow">{bookingBrand.wordmark}</p><h1>Technology for<br/><em>your time.</em></h1>
   <p>Fix It Shop is Katie’s independently operated men’s service business. Aethelios Booking supplies its scheduling and business-operations technology.</p>
   <p>Aethelios Technologies develops the software within Aethelios — The Human Ascendance. Services, pricing and client relationships belong to Fix It Shop’s business operation.</p>
   <p>Legacy Reserve remains an independent grooming and personal-care product brand within Aethelios Lifestyle. Its product commerce is separate from service appointments.</p>
   <Link className="button button-gold" href="/fix-it-shop/app">Return to Fix It Shop ↗</Link>
 </main>;
}
