import { fixItManifest } from "@/lib/fix-it-booking";
import { katieBranding } from "@/lib/katie-branding";
export const dynamic = "force-dynamic";
export async function GET() {
  const p = await katieBranding(),
    manifest = fixItManifest();
  manifest.theme_color = p.theme;
  manifest.icons = [192, 512].map((size) => ({
    src: `/fix-it-shop/app/brand-icons/${size}`,
    sizes: `${size}x${size}`,
    type: "image/png",
    purpose: "any",
  }));
  return Response.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "no-store",
    },
  });
}
