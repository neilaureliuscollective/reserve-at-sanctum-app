import { cookies } from "next/headers";
import { shopifySettings, checkoutUrl } from "@/lib/shopify/config";
import { readCart, changeCart, publicCart, cartAction } from "@/lib/shopify/cart";
import { mutationOrigin, failure } from "@/lib/http";
import { readChairJson } from "@/lib/chair-http";
import { BookingError } from "@/lib/booking";
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
  const cart=await changeCart(settings,jar.get(cookieName)?.value,action);
  jar.set(cookieName,cart.id,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*24*10});
  return Response.json({cart:publicCart(cart),...(action.action==="checkout"?{url:checkoutUrl(cart.checkoutUrl,settings)}:{})},{headers});
 } catch(e) { return failure(e); }
}
