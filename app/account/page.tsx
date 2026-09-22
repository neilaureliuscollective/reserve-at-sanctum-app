import { currentUser } from "@/lib/auth";
import { isPreview } from "@/lib/db";
import { redirect } from "next/navigation";
import { Visits } from "@/components/visits";
export const dynamic = "force-dynamic";
export const metadata = { title: "Your visits" };
export default async function Page() {
  const actor = await currentUser();
  if (!actor) redirect("/signin?next=/account");
  return (
    <main id="main" className="inner-page section workspace-page">
      <Visits actor={actor} preview={isPreview()} />
    </main>
  );
}
