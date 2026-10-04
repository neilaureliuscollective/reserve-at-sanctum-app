import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { assignments } from "@/domains/access";
import { ReserveCommand } from "@/components/reserve-command";
export const dynamic = "force-dynamic";
export default async function Page() {
  const actor = await currentUser();
  if (!actor) redirect("/signin?next=/studio/build-room");
  if (!assignments(actor).some((a) => a.role === "owner")) redirect("/studio");
  return (
    <main id="main" className="inner-page section">
      <ReserveCommand name={actor.name} />
    </main>
  );
}
