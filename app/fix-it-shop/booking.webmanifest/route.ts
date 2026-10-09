import { fixItManifest } from "@/lib/fix-it-booking";
import { katieBranding } from "@/lib/katie-branding";
export const dynamic = "force-dynamic";
export async function GET() {
  const p = await katieBranding(),
    manifest = fixItManifest();
  manifest.theme_color = p.theme;
  manifest.icons = [192, 512].map((size) => ({
    src: `/fix-it-shop/app/brand-icons/${size}?v=steel-symbol-1`,
    sizes: `${size}x${size}`,
    type: "image/png",
    purpose: "any",
  }));
  manifest.icons.push({
    src: "/fix-it-shop/app/icons/512-maskable.png?v=steel-symbol-1",
    sizes: "512x512",
    type: "image/png",
    purpose: "maskable",
  });
  return Response.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "no-store",
    },
  });
}
