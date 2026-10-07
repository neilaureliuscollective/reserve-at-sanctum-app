import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AccountEntrance } from "@/components/experience/account-entrance";
import { MemberConcierge } from "@/components/experience/member-concierge";
export const dynamic = "force-dynamic";
export const metadata = { title: "Aethelios Concierge" };
export default async function Page() {
  const actor = await currentUser();
  if (!actor) return <AccountEntrance next="/aethelios" />;
  if (actor.role !== "client") redirect("/studio");
  return <MemberConcierge />;
}
