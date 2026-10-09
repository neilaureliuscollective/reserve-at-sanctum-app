import Image from "next/image";
import Link from "next/link";
import { AccountEntrance } from "@/components/experience/account-entrance";
import { currentUser } from "@/lib/auth";
import { hasCapability } from "@/lib/studio-permissions";
import { StudioNav } from "@/components/studio-nav";
import { StudioAssistant } from "@/components/studio-assistant";
import "./studio.css";
import "./provider-studio.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Legacy Reserve Studio",
  robots: { index: false, follow: false },
};
export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await currentUser();
  if (!actor) return <div className="legacy-app-theme legacy-studio-entrance" data-legacy-app="true"><AccountEntrance next="/studio" /></div>;
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
  const katie = actor.role !== "owner" && actor.provider_id === "katie";
  return (
    <div className={katie ? undefined : "legacy-app-theme legacy-studio-theme"} data-legacy-app={katie ? undefined : "true"}>
    <StudioAssistant connected={Boolean(process.env.OPENAI_API_KEY)}>
      <div className={`studio-shell${katie ? " fix-it-studio" : ""}`}>
        <header className="studio-masthead">
          <Link href="/studio" className="studio-wordmark">
            <span className="studio-monogram">
              <Image
                src={
                  katie
                    ? "/images/approved/fix-it-shop.webp"
                    : "/brand/legacy-reserve/mark-gold.webp"
                }
                alt=""
                width={32}
                height={32}
              />
            </span>
            <span>
              {katie ? "FIX IT SHOP" : "LEGACY RESERVE"}
              <small>
                {katie
                  ? "KATIE GUIDRY · PRIVATE STUDIO"
                  : "STUDIO · OPERATIONS"}
              </small>
            </span>
          </Link>
          <div className="studio-identity">
            <Link
              className="studio-public-entrance"
              href={katie ? "/fix-it-shop/app" : "/discover"}
            >
              {katie ? "View your customer app" : "View public website"} ↗
            </Link>
            <span>{actor.name.split(" ·")[0]}</span>
            <small>
              {actor.role === "owner"
                ? "Founder · Owner"
                : actor.role === "operator"
                  ? actor.provider_id === "katie"
                    ? "Fix It Shop · Operator"
                    : "Provider · Operator"
                  : "Team · Staff"}
            </small>
          </div>
        </header>
        <StudioNav
          owner={actor.role === "owner"}
          provider={!!actor.provider_id}
        />
        <main id="main" className="studio-canvas">
          {children}
        </main>
        <footer className="studio-foot">
          <span>
            {katie
              ? "FIX IT SHOP · POWERED BY LEGACY RESERVE"
              : "LEGACY RESERVE"}
          </span>
          <Link href="/setup?help=1">Phone setup</Link>
          <Link href="/discover">View public website</Link>
          <Link href="/account">Account</Link>
        </footer>
      </div>
    </StudioAssistant>
    </div>
  );
}
