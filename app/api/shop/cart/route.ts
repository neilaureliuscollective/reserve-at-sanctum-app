import { cookies } from "next/headers";
import { shopifySettings, checkoutUrl } from "@/lib/shopify/config";
import { readCart, changeCart, publicCart, cartAction } from "@/lib/shopify/cart";
import { mutationOrigin, failure } from "@/lib/http";
import { readChairJson } from "@/lib/chair-http";
import { BookingError } from "@/lib/booking";
import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { requireMember } from "@/lib/personal-reserve";
import { conciergeEvent } from "@/lib/concierge-events";
export const dynamic = "force-dynamic";
const cookieName="reserve_shopify_cart";
const headers={"Cache-Control":"private, no-store"};
function config() {
 const value=shopifySettings().config;
 if (!value?.checkout) throw new BookingError("Purchasing is not open yet.",503);
 return value;
}
export async function GET() {
 try {
  const settings=config(), jar=await cookies(), id=jar.get(cookieName)?.value;
  const cart=id ? await readCart(settings,id) : null;
  if (id && !cart) jar.delete(cookieName);
  return Response.json({cart:cart?publicCart(cart):null},{headers});
 } catch(e) { return failure(e); }
}
export async function POST(req:Request) {
 try {
  mutationOrigin(req);
  const action=cartAction.parse(await readChairJson(req));
  const settings=config(), jar=await cookies();
  const attributed = "source" in action && action.source === "aethelios";
  let eventDb;
  if (attributed) {
    const actor = await currentUser(); requireMember(actor);
    eventDb = await database();
    const bucket = Math.floor(Date.now()/60000);
    const rows = await eventDb.query(`INSERT INTO reserve_commerce_rate(user_id,bucket,requests) VALUES($1,$2,1)
      ON CONFLICT(user_id) DO UPDATE SET requests=CASE WHEN reserve_commerce_rate.bucket=$2 THEN reserve_commerce_rate.requests+1 ELSE 1 END,bucket=$2
      WHERE reserve_commerce_rate.bucket<>$2 OR reserve_commerce_rate.requests<6 RETURNING requests`, [actor!.id,bucket]);
    if (!rows.length) throw new BookingError("Take a moment before changing your cart again.",429);
    if (action.action === "checkout") await conciergeEvent(eventDb,"checkout_initiated");
  }
  const cart=await changeCart(settings,jar.get(cookieName)?.value,action);
  if (eventDb && action.action === "add") await conciergeEvent(eventDb,"cart_prepared");
  if (eventDb && action.action === "checkout") await conciergeEvent(eventDb,"checkout_handoff_completed");
  jar.set(cookieName,cart.id,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*24*10});
  return Response.json({cart:publicCart(cart),...(action.action==="checkout"?{url:checkoutUrl(cart.checkoutUrl,settings)}:{})},{headers});
 } catch(e) { return failure(e); }
}
