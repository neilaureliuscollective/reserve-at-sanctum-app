import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { assignments } from "@/domains/access";
import { ShopifyWorkspace } from "@/components/shopify-workspace";
import { legacyRegisterAllowed } from "@/domains/shopify/mode";
import { CommerceWorkspace } from "@/components/commerce-workspace";
export const dynamic = "force-dynamic";
export const metadata = { title: "Reserve commerce" };
export default async function Page() {
  const actor = await currentUser();
  if (!actor) redirect("/signin?next=/studio/commerce");
  if (
    !assignments(actor).some((a) =>
      ["owner", "manager", "reception"].includes(a.role),
    )
  )
    redirect("/studio");
  return legacyRegisterAllowed() ? <CommerceWorkspace /> : <ShopifyWorkspace />;
}
