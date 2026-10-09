import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { readBrandAsset } from "@/lib/provider-brands";
import { failure } from "@/lib/http";
import { BookingError } from "@/lib/booking";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const a = await currentUser();
    if (!a) throw new BookingError("Sign in to Studio.", 401);
    const size = new URL(req.url).searchParams.get("size") || "image";
    const bytes = await readBrandAsset(
      await database(),
      (await params).id,
      size,
      a,
    );
    if (!bytes) return new Response(null, { status: 404 });
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": size === "image" ? "image/webp" : "image/png",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
