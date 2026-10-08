import { currentUser } from "@/lib/auth";
import { BookingError } from "@/lib/booking";
import { shopifyReadiness } from "@/lib/shopify/config";
import { commerceStatus } from "@/lib/commerce";
import { failure } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await currentUser();
    if (!actor) throw new BookingError("Sign in to view your orders.", 401);
    const shop = commerceStatus();
    const shopify = shopifyReadiness().selected;
    return Response.json(
      {
        source: shopify ? "shopify" : shop.source,
        connected: false,
        state: "not_connected",
        orders: null,
        message:
          "Order history is not connected. A prepared checkout does not confirm a purchase.",
        fulfillments: shopify ? [] : shop.fulfillments,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
