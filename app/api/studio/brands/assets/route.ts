import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { BookingError } from "@/lib/booking";
import { requireCapability } from "@/lib/studio-permissions";
import { failure } from "@/lib/http";
import { readChairJson } from "@/lib/chair-http";
import { storeBrandAsset } from "@/lib/provider-brands";
import { prepareBrandImage } from "@/lib/brand-image";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  try {
    if (!process.env.APP_ORIGIN)
      throw new BookingError("Application origin is not configured.", 503);
    if (req.headers.get("origin") !== new URL(process.env.APP_ORIGIN).origin)
      throw new BookingError("Request origin is not allowed.", 403);
    if (!req.headers.get("content-type")?.includes("application/json"))
      throw new BookingError("JSON is required.", 415);
    const a = await currentUser();
    if (!a) throw new BookingError("Sign in to Studio.", 401);
    requireCapability(a, "studio.read");
    requireCapability(a, "workspace.edit");
    const x = z
      .object({
        provider: z.string().min(1).max(80),
        image: z.string().max(700000),
      })
      .strict()
      .parse(await readChairJson(req, 710000));
    if (a.role !== "owner" && a.provider_id !== x.provider)
      throw new BookingError("Provider access is required.", 403);
    return Response.json(
      await storeBrandAsset(
        await database(),
        a,
        x.provider,
        await prepareBrandImage(x.image),
      ),
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
