import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { FixItRuntime } from "../runtime";
import { fixItRelease } from "../../../lib/app-edition";
import "../../../app/legacy-material-tokens.css";
import "../../../app/globals.css";
import "../../../app/cinematic-arrivals.css";
import "../../../app/experience.css";
import "../../../app/visit-continuity.css";
import "../../../app/chair.css";
import "../../../app/reserve-controls.css";
import "../runtime.css";
const sans = localFont({ src: [
  { path: "../../../node_modules/@fontsource/manrope/files/manrope-latin-400-normal.woff2", weight: "400" },
  { path: "../../../node_modules/@fontsource/manrope/files/manrope-latin-600-normal.woff2", weight: "600" },
], variable: "--reserve-sans", display: "swap" });
const serif = localFont({ src: "../../../node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff2", variable: "--reserve-serif", display: "swap" });
export const metadata: Metadata = {
  title: { default: "Fix It Shop · Katie Guidry", template: "%s · Fix It Shop" },
  description: "Katie Guidry’s Fix It Shop. Your appointments and private working day.",
  manifest: "/fix-it-shop/booking.webmanifest",
  icons: {
    icon: [{ url: "/fix-it-shop/app/brand-icons/192?v=steel-symbol-1", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/fix-it-shop/app/brand-icons/180?v=steel-symbol-1", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "Fix It Shop", statusBarStyle: "black-translucent" },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0b1b2a" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={`${sans.variable} ${serif.variable}`}><body data-fix-it-release={fixItRelease}>
    <FixItRuntime />
    <noscript><p className="inner-page">Fix It Shop · Enable JavaScript to sign in and manage appointments.</p></noscript>
    {children}
  </body></html>;
}
