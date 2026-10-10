"use client";
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
    </Link><Link href="/account">Appointment history ↗</Link></header>
    {children}
    <footer className="fix-it-footer"><Link href="/fix-it-shop">Meet Katie</Link><Link href="/privacy">Privacy</Link><Link href="/booking-technology">Powered by {bookingBrand.name}</Link></footer>
    <FixItCustomerNav />
  </div>;
}
