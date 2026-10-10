import type { MetadataRoute } from "next";
import { providerEntrance } from "./booking-identity";
import { safeDestination } from "./experience/entry";
export const fixItBooking = {
  name: "Fix It Shop",
  providerId: "katie",
  founder: "Katie Guidry",
  base: "/fix-it-shop/app",
  book: "/fix-it-shop/app/book",
  visits: "/fix-it-shop/app/appointments",
  signin: "/fix-it-shop/app/signin",
  manifest: "/fix-it-shop/booking.webmanifest",
  theme: "#0b1b2a",
} as const;
export type { BookingIdentity } from "./booking-identity";
export function fixItDestination(value?: string | null) {
  const safeUrl = new URL(safeDestination(value), "https://reserve.invalid");
  const safe = safeUrl.pathname + safeUrl.search + safeUrl.hash;
  return safeUrl.pathname === fixItBooking.base ||
    safeUrl.pathname.startsWith(fixItBooking.base + "/")
    ? safe
    : fixItBooking.visits;
}
export function accountEntranceFor(next: string) {
  return next === fixItBooking.base || next.startsWith(fixItBooking.base + "/")
    ? fixItBooking.signin
    : providerEntrance(next) || "/signin";
}
export function fixItManifest(): MetadataRoute.Manifest {
  return {
    id: fixItBooking.base,
    name: fixItBooking.name,
    short_name: fixItBooking.name,
    description:
      "Book and manage your visits with Katie Guidry, founder of Fix It Shop.",
    start_url: fixItBooking.base + "/launch",
    // Staff, The Chair and auth callbacks stay on the same installed origin.
    scope: "/",
    display: "standalone",
    background_color: "#070b10",
    theme_color: fixItBooking.theme,
    icons: [...[192, 512].map((size) => ({
      src: `/fix-it-shop/app/brand-icons/${size}?v=steel-symbol-1`,
      sizes: `${size}x${size}`,
      type: "image/png",
      purpose: "any" as const,
    })), { src: "/fix-it-shop/app/icons/512-maskable.png?v=steel-symbol-1", sizes: "512x512", type: "image/png", purpose: "maskable" as const }],
    shortcuts: [
      { name: "Book with Katie", url: fixItBooking.book },
      { name: "My appointments", url: fixItBooking.visits },
      { name: "My working day", url: "/studio" },
      { name: "The Chair", url: "/chair" },
    ],
  };
}
