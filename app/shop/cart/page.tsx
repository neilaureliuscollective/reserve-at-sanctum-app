import { MemberShell } from "@/components/experience/member-shell";
import { ShopCart } from "@/components/experience/shop-cart";
export const metadata={title:"Your cart"};
export default function CartPage(){return <MemberShell kicker="THE LEGACY RESERVE COLLECTION" title="Your considered essentials." intro="Review your selection before continuing to secure Shopify checkout."><ShopCart/></MemberShell>;}
