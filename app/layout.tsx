import { shopifyReadiness } from "@/lib/shopify/config";
import { brand } from "@/lib/brand";
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
import "./reserve-material.css";
import "./member-environment.css";
import "./personal-reserve.css";
import "./collection-commerce.css";
import "./digital-reserve.css";
import "./command-shell.css";
import { StatusRibbon } from "@/components/experience/status-ribbon";
import { Footer } from "@/components/footer";
import { configured, isPreview } from "@/lib/db";
import { hasSupabase } from "@/lib/supabase-config";
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.APP_ORIGIN || "https://www.reserveatsanctum.app",
  ),
  title: {
    default: brand.titleDefault,
    template: brand.titleTemplate,
  },
  description: brand.description,
  icons: {
    icon: [
      { url: brand.favicon32, sizes: "32x32", type: "image/png" },
      { url: brand.favicon48, sizes: "48x48", type: "image/png" },
      { url: brand.appIcon192, sizes: "192x192", type: "image/png" },
      { url: brand.appIcon512, sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: brand.appIcon180, sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: brand.name,
    description: brand.description,
    images: [
      { url: brand.openGraph, width: 1200, height: 630, alt: brand.name },
    ],
  },
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    title: brand.appleTitle,
    statusBarStyle: "black-translucent",
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: brand.themeColor,
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
          <section
            className="reserve-no-script"
            aria-labelledby="reserve-no-script-title"
          >
            <p>LEGACY RESERVE</p>
            <h2 id="reserve-no-script-title">Choose your entrance.</h2>
            <nav aria-label="Legacy Reserve destinations without JavaScript">
              <a href="/home">Reserve ↗</a>
              <a href="/pathways">Pathways ↗</a>
              <a href="/vitalis">Vitalis ↗</a>
              <a href="/visit">Sanctum ↗</a>
              <a href="/book">Book ↗</a>
              <a href="/membership">Membership ↗</a>
              <a href="/shop">Collection ↗</a>
              <a href="/my-reserve">My Reserve ↗</a>
              <a href="/chair">The Chair ↗</a>
              <a href="/signin">Account entrance ↗</a>
              <a href="/fix-it-shop">Fix It Shop · Katie Guidry ↗</a>
              <a href="/gent-ascend">Gent Ascend Collective · Neil Stutes ↗</a>
              <a href="/gent-ascend#collection">
                Legacy Reserve collection preview ↗
              </a>
            </nav>
            <small>
              Enable JavaScript to book, sign in, or save your preferences.
              Concept environments remain previews of Legacy Reserve.
            </small>
          </section>
        </noscript>
        <ExperienceChrome footer={<Footer />} status={<StatusRibbon setup={isPreview() || !configured() || !hasSupabase()} checkout={shopifyReadiness().checkoutEnabled} />}>{children}</ExperienceChrome>
      </body>
    </html>
  );
}
