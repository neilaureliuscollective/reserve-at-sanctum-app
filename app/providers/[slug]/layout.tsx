import type { Metadata, Viewport } from "next";
import { publishedBrand } from "@/lib/provider-brand-page";
import { brandIdentity } from "@/lib/provider-brands";
import { ProviderWorld } from "@/components/provider-booking-world";
import "@/app/fix-it-shop/app/booking.css";
import "./provider.css";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const row = await publishedBrand((await params).slug),
    p = row.profile,
    b = brandIdentity(row, p);
  return {
    title: { default: p.name, template: `%s · ${p.name}` },
    description: p.bio || `Appointments with ${p.professional}.`,
    manifest: b.manifest,
    icons: {
      icon: [
        {
          url: `/providers/${row.slug}/icons/192`,
          sizes: "192x192",
          type: "image/png",
        },
      ],
      apple: [
        {
          url: `/providers/${row.slug}/icons/180`,
          sizes: "180x180",
          type: "image/png",
        },
      ],
    },
    appleWebApp: {
      capable: true,
      title: p.name,
      statusBarStyle: "black-translucent",
    },
    openGraph: {
      title: p.name,
      description: p.bio,
      images: [`/providers/${row.slug}/icons/512`],
    },
  };
}
export async function generateViewport({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Viewport> {
  const row = await publishedBrand((await params).slug);
  return {
    themeColor: row.profile.theme,
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  };
}
export default async function Layout({
  params,
  children,
}: {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}) {
  const row = await publishedBrand((await params).slug);
  return (
    <ProviderWorld
      profile={row.profile}
      identity={brandIdentity(row, row.profile)}
    >
      {children}
    </ProviderWorld>
  );
}
