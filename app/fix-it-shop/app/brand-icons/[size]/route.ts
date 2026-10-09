import { katieBrandIcon } from "@/lib/katie-branding";
export const dynamic = "force-dynamic";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const bytes = await katieBrandIcon((await params).size);
  return new Response(bytes ? new Uint8Array(bytes) : null, {
    status: bytes ? 200 : 404,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
