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
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
export const metadata: Metadata = {
  title: {
    default: "The Reserve at Sanctum — Small-town roots. A bigger standard.",
    template: "%s · The Reserve at Sanctum",
  },
  description:
    "A men’s sanctuary in Eunice, Louisiana. Fix It Shop × GENT Ascend Collective. Personal craft, grooming intelligence, and community.",
  icons: { apple: "/icon-180.png" },
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
  themeColor: "#080a09",
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
      <body>
        <Header />
        {children}
        <Footer />
        <aside className="preview-ribbon" aria-label="Preview status">
          PRIVATE PREVIEW <span>·</span> No live appointments or payments
        </aside>
      </body>
    </html>
  );
}
