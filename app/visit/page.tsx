import Link from "next/link";
import Image from "next/image";
import { database } from "@/lib/db";
import { memberRead } from "@/lib/experience/member";
import { listLocations } from "@/lib/experience/locations";
import { MemberShell } from "@/components/experience/member-shell";
export const dynamic = "force-dynamic";
export const metadata = { title: "Legacy Reserve Sanctum" };
export default async function Page() {
  const state = await memberRead(async () => listLocations(await database()));
  // Public location promotion is deliberately limited to the established first house.
  // Candidate cities are not confirmed openings and remain internal planning data.
  const houses =
    state.data?.filter(
      (l) => l.id === "eunice" || (l.enabled && l.status === "operating"),
    ) ?? [];
  return (
    <MemberShell
      kicker="SANCTUM · THE PHYSICAL DESTINATION"
      title="Your Reserve, in person."
      intro="Legacy Reserve is the ecosystem. Sanctum is the destination: personal service, grooming and the care around your visit."
    >
      <div className="sanctum-intro">
        <Image
          src="/images/arrival.webp"
          alt="Concept architecture for a Legacy Reserve destination"
          width={1000}
          height={650}
          sizes="(max-width:700px) 100vw, 70vw"
        />
        <small>Concept architecture</small>
      </div>
      {state.state === "unavailable" ? (
        <section className="member-line">
          <div>
            <h2>Location information could not refresh.</h2>
            <p>Check again before planning your visit.</p>
          </div>
          <Link href="/visit">Try again ↗</Link>
        </section>
      ) : (
        houses.map((l) => (
          <section key={l.id} className="member-line">
            <div>
              <p className="experience-kicker">
                {l.city}, {l.region}
              </p>
              <h2>Legacy Reserve Sanctum — {l.short_name}</h2>
              <p>
                {l.enabled && l.booking_enabled
                  ? "Explore the services and currently available appointments."
                  : "This destination is being prepared. Public appointments are not open."}
              </p>
              {l.address && <p>{l.address}</p>}
              <p className="reserve-field-note">
                Appointment times use {l.timezone}. More location information
                will be published when confirmed.
              </p>
            </div>
            <div className="member-actions">
              {l.enabled && l.booking_enabled && (
                <Link
                  href={`/book?location=${encodeURIComponent(l.id)}`}
                  className="button button-gold"
                >
                  Find your appointment ↗
                </Link>
              )}
              <Link href="/explore" className="text-link">
                Services & people ↗
              </Link>
            </div>
          </section>
        ))
      )}
      <section className="member-line">
        <div>
          <h2>Your Reserve goes with you.</h2>
          <p>
            Your digital routine and member environment are available without
            visiting a physical destination.
          </p>
        </div>
        <Link href="/pathways" className="text-link">
          Explore Pathways ↗
        </Link>
      </section>
    </MemberShell>
  );
}
