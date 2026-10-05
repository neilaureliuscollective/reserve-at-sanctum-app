import Image from "next/image";
import Link from "next/link";
import { AccountEntrance } from "@/components/experience/account-entrance";
import { currentUser } from "@/lib/auth";
import { hasCapability } from "@/lib/studio-permissions";
import { StudioNav } from "@/components/studio-nav";
import "./studio.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "The Reserve Studio",
  robots: { index: false, follow: false },
};
export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await currentUser();
  if (!actor) return <AccountEntrance next="/studio" />;
  if (!hasCapability(actor, "studio.read"))
    return (
      <main id="main" className="inner-page section center-state">
        <p className="eyebrow">STUDIO ACCESS</p>
        <h1>A space for the team.</h1>
        <p>Your account remains connected to your own visits.</p>
        <Link href="/account" className="button button-gold">
          Your visits
        </Link>
      </main>
    );
  return (
    <div className="studio-shell">
      <header className="studio-masthead">
        <Link href="/studio" className="studio-wordmark">
          <span className="studio-monogram">
            <Image
              src="/brand/reserve-rs-v1/rs-gold.svg"
              alt=""
              width={32}
              height={32}
            />
          </span>
          <span>
            THE RESERVE<small>STUDIO · EUNICE</small>
          </span>
        </Link>
        <div className="studio-identity">
          <span>{actor.name.split(" ·")[0]}</span>
          <small>
            {actor.role === "owner"
              ? "Founder · Owner"
              : actor.role === "operator"
                ? "Fix It Shop · Operator"
                : "Team · Staff"}
          </small>
        </div>
      </header>
      <StudioNav owner={actor.role === "owner"} />
      <main id="main" className="studio-canvas">
        {children}
      </main>
      <footer className="studio-foot">
        <span>THE RESERVE AT SANCTUM</span>
        <Link href="/setup?help=1">Phone setup</Link>
        <Link href="/home?explore=1">View Reserve</Link>
        <Link href="/account">Account</Link>
      </footer>
    </div>
  );
}
