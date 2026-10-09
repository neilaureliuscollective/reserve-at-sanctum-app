import { publishedBrand } from "@/lib/provider-brand-page";
import { database } from "@/lib/db";
import { readBrandAsset } from "@/lib/provider-brands";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; size: string }> },
) {
  const { slug, size } = await params,
    row = await publishedBrand(slug);
  const bytes = row.profile.logo
    ? await readBrandAsset(await database(), row.profile.logo, size)
    : null;
  if (!bytes) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
