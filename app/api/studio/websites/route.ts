import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { BookingError } from "@/lib/booking";
import { mutationOrigin } from "@/lib/http";
import { readChairJson } from "@/lib/chair-http";
import { businessFailure } from "@/lib/business-token";
import { reviewWebsite } from "@/lib/business-websites";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  try {
    mutationOrigin(req);
    const actor = await currentUser();
    if (!actor) throw new BookingError("Sign in required.", 401);
    const result = await reviewWebsite(
      await database(),
      actor,
      await readChairJson(req, 2000),
    );
    return Response.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return businessFailure(e);
  }
}
