import Link from "next/link";
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
  const data = await readMemberSummary(client);
  const house = data.houses.data?.house;
  const next = data.visits.data?.next,
    previous = data.visits.data?.previous;
  const label = house
    ? `Legacy Reserve — ${house.short_name}`
    : "Legacy Reserve";
  const bookPath = house
    ? `/book?location=${encodeURIComponent(house.id)}`
    : "/book";
  return (
    <MemberShell
      kicker={label}
      title={
        client
          ? `Welcome back, ${client.name.split(" ")[0]}.`
          : "A standard to return to."
      }
      intro={
        client
          ? "Your time. Your direction. Your Reserve."
          : "Book your visit, prepare The Chair, and keep your personal preferences together."
      }
    >
      <HomeRefresh />
      <section className="member-focus" aria-labelledby="member-next-title">
        <p className="experience-kicker">
          {next ? "YOUR NEXT VISIT" : "YOUR NEXT STEP"}
        </p>
        <h2 id="member-next-title">
          {data.visits.state === "unavailable"
            ? "Your visits could not refresh."
            : next
              ? next.service_name
              : previous?.rebook_available
                ? "Return to your usual."
                : "Make time for yourself."}
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
                ? `Legacy Reserve — ${next.location_name}`
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
