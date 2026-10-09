import { FixItInstallCapture } from "@/components/fix-it-install";
import type { Metadata, Viewport } from "next";
import Image from "next/image";
import Link from "next/link";
import { fixItBooking as brand } from "@/lib/fix-it-booking";
import "./booking.css";
export const metadata: Metadata = {
  title: {
    default: "Fix It Shop · Katie Guidry",
    template: "%s · Fix It Shop",
  },
  description: "Your appointments with Katie Guidry, founder of Fix It Shop.",
  manifest: brand.manifest,
  icons: {
    icon: [
      {
        url: "/fix-it-shop/app/icons/192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/fix-it-shop/app/icons/180.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "Fix It Shop",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "Fix It Shop · Katie Guidry",
    description: "A personal visit. Book and manage appointments with Katie.",
    images: ["/images/approved/fix-it-shop.webp"],
  },
};
export const viewport: Viewport = {
  themeColor: brand.theme,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <FixItInstallCapture>
      <div className="fix-it-app">
        <a className="skip" href="#main">
          Skip to content
        </a>
        <header className="fix-it-masthead">
          <Link href={brand.base} aria-label="Fix It Shop home">
            <Image
              src="/images/approved/fix-it-shop.webp"
              width={52}
              height={52}
              alt=""
            />
            <span>
              FIX IT SHOP<small>KATIE GUIDRY · FOUNDER</small>
            </span>
          </Link>
          <Link className="text-link" href={brand.visits}>
            My visits ↗
          </Link>
        </header>
        {children}
        <footer className="fix-it-footer">
          <span>Fix It Shop · Katie Guidry</span>
          <Link href="/fix-it-shop">Meet Katie</Link>
          <Link href="/discover">Powered by Legacy Reserve ↗</Link>
        </footer>
        <nav className="fix-it-nav" aria-label="Fix It Shop">
          <Link href={brand.base}>Home</Link>
          <Link href={brand.book}>Book</Link>
          <Link href={brand.visits}>My visits</Link>
          <Link href={brand.base + "/install"}>Phone setup</Link>
        </nav>
      </div>
    </FixItInstallCapture>
  );
}
