import { publishedBrand } from "@/lib/provider-brand-page";
import { brandIdentity } from "@/lib/provider-brands";
import { providerManifest } from "@/lib/booking-identity";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const row = await publishedBrand((await params).slug),
    b = brandIdentity(row, row.profile);
  return Response.json(
    providerManifest(b, (size) => `/providers/${row.slug}/icons/${size}`),
    {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "no-store",
      },
    },
  );
}
