import type { Metadata, Viewport } from "next";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "./globals.css";
import "./editorial.css";
import "./brand-worlds.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
export const metadata: Metadata = {
  title: {
    default: "The Reserve at Sanctum — A higher you belongs here",
    template: "%s · The Reserve at Sanctum",
  },
  description:
    "A men’s sanctuary in Eunice, Louisiana. Fix It Shop × Aurelius Collective. Grooming, wellbeing, and community.",
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
  themeColor: "#080e13",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <Header />
        {children}
        <Footer />
        <div className="preview-ribbon">
          PRIVATE PREVIEW <span>·</span> No live appointments or payments
        </div>
      </body>
    </html>
  );
}
