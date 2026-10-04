import { legacyRegisterAllowed } from "@/domains/shopify/mode";
import { currentUser } from "@/lib/auth";
import { isPreview } from "@/lib/db";
import { redirect } from "next/navigation";
import { assignments } from "@/domains/access";
import { OperationsWorkspace } from "@/components/operations-workspace";
export const dynamic = "force-dynamic";
export const metadata = { title: "Reserve Operations" };
export default async function Page() {
  const actor = await currentUser();
  if (!actor) redirect("/signin?next=/studio");
  if (!assignments(actor).length) redirect("/account");
  return (
    <OperationsWorkspace
      actor={actor}
      preview={isPreview()}
      legacyCommerce={legacyRegisterAllowed()}
    />
  );
}
