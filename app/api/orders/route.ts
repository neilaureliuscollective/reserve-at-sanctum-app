import { currentUser } from "@/lib/auth";
import { BookingError } from "@/lib/booking";
import { commerceStatus } from "@/lib/commerce";
import { failure } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await currentUser();
    if (!actor) throw new BookingError("Sign in to view your orders.", 401);
    const shop = commerceStatus();
    return Response.json(
      {
        source: shop.source,
        connected: shop.connected,
        orders: [],
        fulfillments: shop.fulfillments,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
