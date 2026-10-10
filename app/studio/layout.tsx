import { bookingBrand } from "@/lib/booking-brand";
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
  title: { absolute: "Aethelios Booking · Operations" },
  manifest: "/manifest.webmanifest",
  robots: { index: false, follow: false },
};
export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await currentUser();
  if (!actor) return <div className="aethelios-booking-studio"><AccountEntrance next="/studio" /></div>;
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
    <div>
    <StudioAssistant connected={Boolean(process.env.OPENAI_API_KEY)}>
      <div className="studio-shell aethelios-booking-studio">
        <header className="studio-masthead">
          <Link href="/studio" className="studio-wordmark">
            <span className="studio-monogram">
              <span aria-hidden="true">AB</span>
            </span>
            <span>
              {bookingBrand.wordmark}
              <small>
                {katie
                  ? "FIX IT SHOP · KATIE’S STUDIO"
                  : "FIX IT SHOP · OPERATIONS"}
              </small>
            </span>
          </Link>
          <div className="studio-identity">
            <Link
              className="studio-public-entrance"
              href="/fix-it-shop/app"
            >
              {katie ? "View your customer app" : "View public website"} ↗
            </Link>
            <span>{actor.name.split(" ·")[0]}</span>
            <small>
              {actor.role === "owner"
                ? "Platform administrator"
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
              ? "FIX IT SHOP · POWERED BY AETHELIOS BOOKING"
              : "AETHELIOS BOOKING"}
          </span>
          <Link href="/fix-it-shop/app/install">Phone setup</Link>
          <Link href="/fix-it-shop/app">View public website</Link>
          <Link href="/account">Account</Link>
        </footer>
      </div>
    </StudioAssistant>
    </div>
  );
}
