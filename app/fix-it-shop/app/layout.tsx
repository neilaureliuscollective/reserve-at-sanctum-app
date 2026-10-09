import { katieBranding } from "@/lib/katie-branding";
import { ProviderWorld } from "@/components/provider-booking-world";
import "@/app/providers/[slug]/provider.css";
import type { Metadata, Viewport } from "next";
import { fixItBooking as brand } from "@/lib/fix-it-booking";
import "./booking.css";
import "../sanctum-steel.css";
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
        url: "/fix-it-shop/app/brand-icons/192",
        sizes: "192x192",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/fix-it-shop/app/brand-icons/180",
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
export async function generateViewport(): Promise<Viewport> {
  return {
    themeColor: (await katieBranding()).theme,
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  };
}
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const p = await katieBranding();
  return (
    <ProviderWorld profile={p} identity={{ ...brand, theme: p.theme }}>
      {children}
    </ProviderWorld>
  );
}
