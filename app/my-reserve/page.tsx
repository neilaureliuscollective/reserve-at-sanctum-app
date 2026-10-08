import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { readMemberSummary } from "@/lib/experience/member";
import { MemberShell } from "@/components/experience/member-shell";
import { AccountEntrance } from "@/components/experience/account-entrance";
import { LocationPreference } from "@/components/experience/location-preference";
export const dynamic = "force-dynamic";
export const metadata = { title: "My Reserve" };
export default async function MyReserve() {
  const actor = await currentUser();
  if (!actor) return <AccountEntrance next="/my-reserve" />;
  if (actor.role !== "client") redirect("/studio");
  const data = await readMemberSummary(actor);
  return (
    <MemberShell
      kicker="LEGACY RESERVE · MY RESERVE"
      title={`Your Reserve, ${actor.name.split(" ")[0]}.`}
      intro="Your personal direction, preferences and the history that makes this Reserve yours."
    >
      <section className="member-line">
        <div>
          <p className="experience-kicker">VITALIS · FREE WELLNESS PILOT</p>
          <h2>Your everyday rhythm.</h2>
          <p>
            A personal direction, a practical weekly target and private
            completion history. No medical or paid enrollment.
          </p>
        </div>
        <Link href="/vitalis/journey" className="text-link">
          Open your wellness rhythm ↗
        </Link>
      </section>
      <section className="member-line">
        <div>
          <p className="experience-kicker">PERSONAL DIRECTION</p>
          <h2>Your everyday foundation.</h2>
          <p>
            Keep a simple routine for presence, performance or wellbeing. Your
            visit preferences remain separate.
          </p>
        </div>
        <Link href="/pathways" className="text-link">
          Your routine & pathways ↗
        </Link>
      </section>
      <section className="member-line">
        <div>
          <p className="experience-kicker">APPEARANCE</p>
          <h2>Keep your direction.</h2>
          <p>
            Your saved grooming priorities and personal Blueprint. Update them
            whenever your standard changes.
          </p>
        </div>
        <Link href="/profile" className="button button-gold">
          Your profile ↗
        </Link>
      </section>
      <section className="member-line">
        <div>
          <p className="experience-kicker">THE CHAIR</p>
          <h2>Your visit. Your pace.</h2>
          <p>
            Prepare your conversation and grooming preferences for Katie. Saving
            and sharing remain your choice.
          </p>
        </div>
        <Link href="/chair" className="text-link">
          Prepare The Chair ↗
        </Link>
      </section>
      <section className="member-line">
        <div>
          <p className="experience-kicker">VISIT HISTORY</p>
          <h2>Time kept together.</h2>
          <p>
            {data.visits.state === "unavailable"
              ? "Your visit history could not refresh. Open your appointments to try again."
              : data.visits.data?.previous
                ? `Most recent appointment: ${data.visits.data.previous.service_name}.`
                : "Your appointments will be kept here as you book and return."}
          </p>
        </div>
        <Link href="/account" className="text-link">
          Manage appointments ↗
        </Link>
      </section>
      <section className="member-line">
        <div>
          <p className="experience-kicker">YOUR HOUSE</p>
          <h2>
            {data.houses.data?.house
              ? `Legacy Reserve Sanctum — ${data.houses.data.house.short_name}`
              : "Location information unavailable."}
          </h2>
          <p>
            Your preferred house does not change an existing appointment or your
            membership eligibility.
          </p>
          {data.houses.state === "ready" && (
            <LocationPreference
              locations={data.houses.data.locations.map((l) => ({
                id: l.id,
                label: `Legacy Reserve Sanctum — ${l.short_name}`,
              }))}
              selected={data.houses.data.house?.id || ""}
            />
          )}
        </div>
        <Link href="/visit" className="text-link">
          Location information ↗
        </Link>
      </section>
      <footer className="member-foot">
        <Link href="/membership">Membership details ↗</Link>
        <Link href="/signin">Account & sign-in ↗</Link>
        <Link href="/shop">The collection ↗</Link>
      </footer>
    </MemberShell>
  );
}
