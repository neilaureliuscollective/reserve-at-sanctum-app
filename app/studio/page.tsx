import { currentUser } from "@/lib/auth";
import { isPreview } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Visits } from "@/components/visits";
export const dynamic = "force-dynamic";
export const metadata = { title: "Katie’s studio" };
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
      <Visits actor={actor} studio preview={isPreview()} />
    </main>
  );
}
