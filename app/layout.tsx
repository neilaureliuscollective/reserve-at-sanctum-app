import { reserveRelease } from "@/lib/experience/release";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
const reserveSans = localFont({
  src: [
    {
      path: "../node_modules/@fontsource/manrope/files/manrope-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/manrope/files/manrope-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/manrope/files/manrope-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--reserve-sans",
  display: "swap",
  adjustFontFallback: "Arial",
});
const reserveSerif = localFont({
  src: [
    {
      path: "../node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-italic.woff2",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--reserve-serif",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});
import "./globals.css";
import "./editorial.css";
import "./brand-worlds.css";
import "./gent-ascend.css";
import "./chair.css";
import "./living-emblems.css";
import "./reserve-identity.css";
import { ExperienceChrome } from "@/components/experience/chrome";
import "./experience.css";
import "./visit-continuity.css";
import "./reserve-controls.css";
import { Footer } from "@/components/footer";
import { configured, isPreview } from "@/lib/db";
import { hasSupabase } from "@/lib/supabase-config";
export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_ORIGIN || "https://reserve-at-sanctum-app.vercel.app"),
  title: {
    default: "The Reserve at Sanctum — Small-town roots. A bigger standard.",
    template: "%s · The Reserve at Sanctum",
  },
  description:
    "A men’s sanctuary in Eunice, Louisiana. Fix It Shop × GENT Ascend Collective. Personal craft, grooming intelligence, and community.",
  icons: {
    icon: [{ url: "/brand/reserve-rs-v1/app-icon-rs2-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/brand/reserve-rs-v1/app-icon-rs2-180.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: { images: [{ url: "/brand/reserve-rs-v1/open-graph.png", width: 1200, height: 630, alt: "The Reserve at Sanctum" }] },
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    title: "The Reserve",
    statusBarStyle: "black-translucent",
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#070909",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${reserveSans.variable} ${reserveSerif.variable}`}
    >
      <body data-reserve-release={reserveRelease}>
        <noscript><section className="reserve-no-script" aria-labelledby="reserve-no-script-title"><p>THE RESERVE · EUNICE</p><h2 id="reserve-no-script-title">Choose your entrance.</h2><nav aria-label="Reserve destinations without JavaScript"><a href="/fix-it-shop">Fix It Shop · Katie Guidry ↗</a><a href="/gent-ascend">Gent Ascend Collective · Neil Stutes ↗</a><a href="/gent-ascend#collection">Legacy Reserve collection preview ↗</a><a href="/book">Booking entrance ↗</a><a href="/signin">Account entrance ↗</a></nav><small>Enable JavaScript to book, sign in, or save your preferences. Concept environments remain previews of Reserve.</small></section></noscript>
        <ExperienceChrome footer={<Footer />}>{children}</ExperienceChrome>
        <aside className="preview-ribbon" aria-label="Reserve status">
          {isPreview() || !configured() || !hasSupabase()
            ? "PRIVATE SETUP"
            : "PRIVATE PILOT"} <span>·</span> Appointments and payments are not yet live
        </aside>
      </body>
    </html>
  );
}
