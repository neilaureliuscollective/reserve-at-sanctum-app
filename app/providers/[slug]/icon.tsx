import { publishedBrand } from "@/lib/provider-brand-page";
import { database } from "@/lib/db";
import { readBrandAsset } from "@/lib/provider-brands";
export const size = { width: 192, height: 192 };
export const contentType = "image/png";
export default async function Icon({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const row = await publishedBrand((await params).slug);
  const bytes = row.profile.logo
    ? await readBrandAsset(await database(), row.profile.logo, "192")
    : null;
  return new Response(bytes ? new Uint8Array(bytes) : null, {
    status: bytes ? 200 : 404,
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
  });
}
