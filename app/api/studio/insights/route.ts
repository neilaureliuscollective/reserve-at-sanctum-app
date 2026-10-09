import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { BookingError } from "@/lib/booking";
import { providerInsights } from "@/lib/provider-insights";
import { failure } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const actor = await currentUser();
    if (!actor) throw new BookingError("Sign in to Studio.", 401);
    const p = new URL(req.url).searchParams;
    return Response.json(
      await providerInsights(await database(), actor, {
        provider: p.get("provider") || undefined,
        location: p.get("location") || undefined,
        days: p.get("days") || undefined,
        page: p.get("page") || undefined,
      }),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    const response = failure(e);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
}
