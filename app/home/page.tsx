import Link from "next/link";
import { database } from "@/lib/db";
import { memberRead } from "@/lib/experience/member";
import { readRoutine } from "@/lib/personal-reserve";
import { DateTime } from "luxon";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { readMemberSummary } from "@/lib/experience/member";
import { MemberShell } from "@/components/experience/member-shell";
import { MemberDesk } from "@/components/experience/member-desk";
import { HomeRefresh } from "@/components/experience/home-refresh";
import { rebookPath } from "@/lib/experience/visits";
export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ explore?: string }>;
}) {
  const actor = await currentUser();
  const exploring = (await searchParams).explore === "1";
  if (actor && actor.role !== "client" && !exploring) redirect("/studio");
  const client = actor?.role === "client" && !exploring ? actor : null;
  const [data, routineState] = await Promise.all([
    readMemberSummary(client),
    client
      ? memberRead(async () => readRoutine(await database(), client))
      : Promise.resolve(null),
  ]);
  const routine =
    routineState?.data && !routineState.data.cleared ? routineState.data : null;
  const house = data.houses.data?.house;
  const next = data.visits.data?.next,
    previous = data.visits.data?.previous;

  const bookPath = house
    ? `/book?location=${encodeURIComponent(house.id)}`
    : "/book";
  return (
    <MemberShell
      kicker="YOUR PERSONAL RESERVE"
      title={
        client
          ? `Welcome back, ${client.name.split(" ")[0]}.`
          : "A standard to return to."
      }
      intro={
        client
          ? "Your time. Your direction. Your Reserve."
          : "Presence, performance and wellbeing. Your personal direction, wherever you are."
      }
    >
      <HomeRefresh />
      <section className="reserve-direction" aria-labelledby="direction-title">
        <div>
          <p className="experience-kicker">
            {routine
              ? `YOUR PRIORITY · ${routine.priority.toUpperCase()}`
              : "YOUR NEXT CHAPTER"}
          </p>
          <h2 id="direction-title">
            {routine?.title ?? "A standard that travels with you."}
          </h2>
          {routine ? (
            <ol>
              {routine.steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          ) : (
            <p>
              {routineState?.state === "unavailable"
                ? "Your saved routine could not refresh. Try again before making changes."
                : "Choose one priority. Create a simple routine for your presence, performance or wellbeing, and keep it close."}
            </p>
          )}
          <div className="member-actions">
            <Link href="/pathways" className="button button-gold">
              {routine ? "Refine your routine" : "Find your direction"} ↗
            </Link>
            <Link href="/my-reserve" className="text-link">
              Your preferences ↗
            </Link>
          </div>
        </div>
        <aside>
          <p className="experience-kicker">AETHELIOS</p>
          <h3>A considered next step.</h3>
          <p>
            Your concierge connects your personal direction with verified
            membership and Sanctum tools.
          </p>
          <Link href="/aethelios" className="text-link">
            Talk with Aethelios ↗
          </Link>
        </aside>
      </section>
      <section className="member-focus" aria-labelledby="member-next-title">
        <p className="experience-kicker">
          {next ? "YOUR NEXT VISIT" : "SANCTUM"}
        </p>
        <h2 id="member-next-title">
          {data.visits.state === "unavailable"
            ? "Your visits could not refresh."
            : next
              ? next.service_name
              : previous?.rebook_available
                ? "Return to your usual."
                : "Your physical destination."}
        </h2>
        {next ? (
          <>
            <p className="member-visit-date">
              {DateTime.fromJSDate(new Date(next.starts_at))
                .setZone(next.location_timezone || "America/Chicago")
                .toFormat("cccc, LLLL d · h:mm a")}
            </p>
            <p>
              {next.provider_name} ·{" "}
              {next.location_name
                ? `Legacy Reserve Sanctum — ${next.location_name}`
                : "Location not recorded"}
            </p>
            <div className="member-actions">
              <Link
                prefetch={false}
                href={`/my-visit?visit=${next.id}`}
                className="button button-gold"
              >
                Prepare your visit ↗
              </Link>
              <Link href="/account" className="text-link">
                Manage appointments ↗
              </Link>
            </div>
          </>
        ) : (
          <>
            <p>
              {data.visits.state === "unavailable"
                ? "Try again before making another appointment."
                : house?.booking_enabled
                  ? "Choose a service and a time. Your preferences can come first."
                  : "Appointments are being prepared. You can save your preferences while the house gets ready."}
            </p>
            <div className="member-actions">
              <Link
                href={
                  data.visits.state === "unavailable"
                    ? "/home"
                    : previous?.rebook_available
                      ? rebookPath(previous)
                      : bookPath
                }
                className="button button-gold"
              >
                {data.visits.state === "unavailable"
                  ? "Try again"
                  : previous?.rebook_available
                    ? "Book this service again"
                    : "Explore appointments"}{" "}
                ↗
              </Link>
              <Link
                href={client ? "/my-reserve" : "/signin?next=/home"}
                className="text-link"
              >
                {client ? "Your preferences" : "Sign in to your Reserve"} ↗
              </Link>
            </div>
          </>
        )}
      </section>
      <section className="member-line">
        <div>
          <p className="experience-kicker">
            LEGACY RESERVE VITALIS · COMING SOON
          </p>
          <h2>A longer horizon.</h2>
          <p>
            Advanced health intelligence, diagnostics and future clinical
            partnerships. Explore the vision and register for early access.
          </p>
        </div>
        <Link href="/vitalis" className="button button-outline">
          Discover Vitalis ↗
        </Link>
      </section>
      <MemberDesk desk={data.membership} />
      <section className="member-line">
        <div>
          <p className="experience-kicker">BETWEEN VISITS</p>
          <h2>Your own direction.</h2>
          <p>
            Keep your appearance priorities and visit preferences ready for the
            next time you come in.
          </p>
        </div>
        <Link href="/profile" className="text-link">
          Open your profile ↗
        </Link>
      </section>
      <footer className="member-foot">
        <Link href="/shop">Explore the collection ↗</Link>
        <Link href="/visit">Location information ↗</Link>
        <Link href="/explore">Services & people ↗</Link>
      </footer>
    </MemberShell>
  );
}
