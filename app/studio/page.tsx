import { currentUser } from "@/lib/auth";
import { isPreview } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChairStudio } from "@/components/chair-studio";
import { canReadChairStudio } from "@/lib/chair-store";
import { StudioBlocks } from "@/components/studio-blocks";
import { Visits } from "@/components/visits";
import { ReserveCommand } from "@/components/reserve-command";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reserve Command" };

export default async function Page() {
  const actor = await currentUser();
  if (!actor) redirect("/signin?next=/studio");

  if (actor.role === "client")
    return (
      <main id="main" className="inner-page section center-state">
        <p className="eyebrow">STUDIO ACCESS</p>
        <h1>
          A space for <em>the team.</em>
        </h1>
        <p>This account has access to your own visits.</p>
        <Link className="button button-gold" href="/account">
          Your visits
        </Link>
        {isPreview() && (
          <Link className="text-link" href="/signin?next=/studio">
            Switch preview identity
          </Link>
        )}
      </main>
    );

  return (
    <main id="main" className="inner-page section workspace-page">
      <ReserveCommand name={actor.name} />
      <section id="schedule">
        <Visits actor={actor} studio preview={isPreview()} />
      </section>
      {canReadChairStudio(actor) && (
        <section id="availability">
          <StudioBlocks />
        </section>
      )}
      {canReadChairStudio(actor) && <ChairStudio />}
      <div className="setup-actions">
        <Link className="text-link" href="/setup">
          Set up the Reserve on another phone
        </Link>
      </div>
    </main>
  );
}
