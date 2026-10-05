import { AccountEntrance } from "@/components/experience/account-entrance";
import { currentUser } from "@/lib/auth";
import { isPreview } from "@/lib/db";
import Link from "next/link";
import { OperatorWorkspace } from "@/components/operator-workspace";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reserve Command" };

export default async function Page({ searchParams }: { searchParams: Promise<{tab?:string;date?:string}> }) {
  const actor = await currentUser();
  if (!actor) return <AccountEntrance next="/studio" />;

  if (actor.role === "client")
    return (
      <main id="main" className="inner-page section center-state">
        <p className="eyebrow">STUDIO ACCESS</p>
        <h1>
          A space for <em>the team.</em>
        </h1>
        <p>This account has access to your own visits.</p>
        <Link prefetch={false} className="button button-gold" href="/account">
          Your visits
        </Link>
        {isPreview() && (
          <Link prefetch={false} className="text-link" href="/signin?next=/studio">
            Switch preview identity
          </Link>
        )}
      </main>
    );

  const params = await searchParams;
  return <OperatorWorkspace actor={actor} preview={isPreview()} initialTab={params.tab} initialDate={params.date} />;
}
