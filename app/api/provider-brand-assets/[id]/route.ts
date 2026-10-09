import { database } from "@/lib/db";
import { readBrandAsset } from "@/lib/provider-brands";
export const dynamic = "force-dynamic";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const size = new URL(req.url).searchParams.get("size") || "image";
  try {
    const bytes = await readBrandAsset(
      await database(),
      (await params).id,
      size,
    );
    if (!bytes)
      return new Response(null, {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      });
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": size === "image" ? "image/webp" : "image/png",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
