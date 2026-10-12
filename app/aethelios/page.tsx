import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AccountEntrance } from "@/components/experience/account-entrance";
import { MemberConcierge } from "@/components/experience/member-concierge";
export const dynamic = "force-dynamic";
export const metadata = { title: "Aethelios Concierge" };
export default async function Page({searchParams}:{searchParams:Promise<{product?:string}>}) {
  const handle=(await searchParams).product;
  const productHandle=handle && /^[a-z0-9][a-z0-9_-]{0,199}$/.test(handle)?handle:undefined;
  const actor = await currentUser();
  if (!actor) return <AccountEntrance next={productHandle?`/aethelios?product=${encodeURIComponent(productHandle)}`:"/aethelios"} />;
  if (actor.role !== "client") redirect("/studio");
  return <MemberConcierge key={productHandle ?? "general"} productHandle={productHandle} />;
}
