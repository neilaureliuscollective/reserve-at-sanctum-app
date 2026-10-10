import { shopifyReadiness } from "@/lib/shopify/config";
import { fixItBooking } from "@/lib/fix-it-booking";
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
import "./legacy-material-tokens.css";
import "./globals.css";
import "./cinematic-arrivals.css";
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
import "./reserve-material.css";
import "./member-environment.css";
import "./personal-reserve.css";
import "./collection-commerce.css";
import "./digital-reserve.css";
import "./command-shell.css";
import "./imperial-emerald.css";
import "./design-system-v2.css";
import "./app-materials.css";
import "./legacy-app-theme.css";
import "./booking-transformation.css";
import { StatusRibbon } from "@/components/experience/status-ribbon";
import { Footer } from "@/components/footer";
import { configured, isPreview } from "@/lib/db";
import { hasSupabase } from "@/lib/supabase-config";
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.APP_ORIGIN || "https://www.reserveatsanctum.app",
  ),
  title: {
    default: "Fix It Shop · Katie Guidry",
    template: "%s · Fix It Shop",
  },
  description: "Katie’s independent men’s grooming and hair services. Book and manage your visits with Fix It Shop.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/fix-it-shop/app/brand-icons/192?v=steel-symbol-1", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/fix-it-shop/app/brand-icons/180?v=steel-symbol-1", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Fix It Shop", description: "A personal visit with Katie. Her business. Her standard.",
    images: [{ url: "/images/approved/fix-it-shop.webp", alt: "Fix It Shop" }],
  },
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    title: fixItBooking.name,
    statusBarStyle: "black-translucent",
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: fixItBooking.theme,
  viewportFit: "cover",
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
        <noscript>
          <section className="reserve-no-script" aria-label="Fix It Shop without JavaScript">
            <p>FIX IT SHOP</p>
            <nav aria-label="Fix It Shop destinations">
              <a href="/fix-it-shop/app">Home</a>
              <a href="/fix-it-shop/app/book">Book</a>
              <a href="/account">Appointment history</a>
              <a href="/chair">The Chair</a>
              <a href="/studio">Private Studio</a>
            </nav>
            <small>Enable JavaScript to book, sign in, or save preferences.</small>
          </section>
        </noscript>
        <ExperienceChrome footer={<Footer />} status={<StatusRibbon setup={isPreview() || !configured() || !hasSupabase()} checkout={shopifyReadiness().checkoutEnabled} />}>{children}</ExperienceChrome>
      </body>
    </html>
  );
}
