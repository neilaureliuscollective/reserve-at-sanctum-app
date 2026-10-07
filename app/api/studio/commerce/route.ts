import { currentUser } from "@/lib/auth";
import { BookingError } from "@/lib/booking";
import { database } from "@/lib/db";
import { requireMembershipOwner } from "@/lib/membership-operations";
import { failure } from "@/lib/http";
import { checkoutOverview } from "@/lib/collection-checkout";
import { shopifyReadiness } from "@/lib/shopify/config";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const actor = await currentUser();
    if (!actor) throw new BookingError("Sign in to Studio.", 401);
    requireMembershipOwner(actor);
    return Response.json(
      {
        readiness: shopifyReadiness(),
        overview: await checkoutOverview(await database(), actor),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
