import { katieBrandIcon } from "@/lib/katie-branding";
export const size = { width: 192, height: 192 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";
export default async function Icon() {
  const bytes = await katieBrandIcon("192");
  return new Response(bytes ? new Uint8Array(bytes) : null, {
    status: bytes ? 200 : 404,
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
  });
}
