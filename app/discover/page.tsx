import Link from "next/link";
import { Flagship } from "@/components/flagship/flagship";
export const metadata = {
  title: "Built for Presence",
  description: "Legacy Reserve connects refined essentials, personal routines, performance and wellbeing. A standard to return to, wherever you are.",
};
export default function Discover() { return <><aside className="booking-notice"><p>This historical Legacy Reserve experience remains available during its transition to Aethelios Lifestyle. Fix It Shop is Katie’s independent service business.</p><Link href="/fix-it-shop/app">Book and manage Fix It Shop visits ↗</Link> · <Link href="/shop">Legacy Reserve product collection ↗</Link></aside><Flagship /></>; }
