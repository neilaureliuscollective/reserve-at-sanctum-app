import { fixItManifest } from "@/lib/fix-it-booking";
import { katieBranding } from "@/lib/katie-branding";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({ ...fixItManifest(), theme_color: (await katieBranding()).theme }, {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "no-store" },
  });
}
