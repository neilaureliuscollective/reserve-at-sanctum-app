"use client";
import { fixItPublicBooking as booking } from "@/lib/fix-it-public-booking";
import type { ReactNode } from "react";
import Link from "next/link";
import { FixItCustomerNav } from "./fix-it-customer";
import { fixItBooking } from "@/lib/fix-it-booking";
import { bookingBrand } from "@/lib/booking-brand";
/** Shared legacy service URLs keep their payloads and query strings. */
export function ServiceChrome({ children }: { children: ReactNode }) {
  return <div className="fix-it-service-shell">
    <a className="skip" href="#main">Skip to content</a>
    <header className="fix-it-masthead"><Link href={fixItBooking.base}>
      <img src="/images/approved/fix-it-shop.webp" width="52" height="52" alt="" />
      <span>FIX IT SHOP<small>MEN’S GROOMING · KATIE GUIDRY</small></span>
    </Link><a href={booking.href}>Appointments on GlossGenius ↗</a></header>
    {children}
    <footer className="fix-it-footer"><a href={booking.href}>{booking.label} ↗</a><Link href="/account">Website appointment history</Link><Link href="/fix-it-shop">Meet Katie</Link><Link href="/privacy">Privacy</Link><Link href="/booking-technology">Powered by {bookingBrand.name}</Link></footer>
    <FixItCustomerNav />
  </div>;
}
