import Link from "next/link";
import { DigitalInstrument } from "@/components/digital-instrument";
import { readJourney } from "@/lib/vitalis/journey-store";
import { foundations } from "@/lib/vitalis/journey-design";
import { database } from "@/lib/db";
import { memberRead } from "@/lib/experience/member";
import { readRoutine } from "@/lib/personal-reserve";
import { DateTime } from "luxon";
import { redirect } from "next/navigation";
import { publicUser } from "@/lib/auth";
import { readMemberSummary } from "@/lib/experience/member";
import { MemberShell } from "@/components/experience/member-shell";
import { HomeRefresh } from "@/components/experience/home-refresh";
import { rebookPath } from "@/lib/experience/visits";
import { ImperialWorlds } from "@/components/imperial-worlds";
import { ImperialSurface } from "@/components/imperial-surface";
export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ explore?: string }>;
}) {
  const actor = await publicUser();
  const exploring = (await searchParams).explore === "1";
  if (actor && actor.role !== "client" && !exploring) redirect("/studio");
  const client = actor?.role === "client" && !exploring ? actor : null;
  const [data, routineState, wellnessState] = await Promise.all([
    readMemberSummary(client),
    client
      ? memberRead(async () => readRoutine(await database(), client))
      : Promise.resolve(null),
    client ? memberRead(async () => readJourney(await database(), client)) : Promise.resolve(null),
  ]);
  const routine =
    routineState?.data && !routineState.data.cleared ? routineState.data : null;
  const wellness = wellnessState?.data;
  const journey = wellness?.journey?.active ? wellness.journey : null;
  const foundation = journey?.direction ? foundations[journey.direction] : null;
  const completed = wellness && journey ? wellness.week.filter(day => journey.days.includes(day)).length : 0;
  const house = data.houses.data?.house;
  const next = data.visits.data?.next,
    previous = data.visits.data?.previous;

  const bookPath = house
    ? `/book?location=${encodeURIComponent(house.id)}`
    : "/visit";
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
      <ImperialWorlds />
      <ImperialSurface level="hero" className="member-priority-stage" aria-labelledby="direction-title">
        <div><p className="experience-kicker">{routine ? `YOUR PRIORITY · ${routine.priority.toUpperCase()}` : "YOUR NEXT CHAPTER"}</p>
          <h2 id="direction-title">{routine?.title ?? "A standard that travels with you."}</h2>
          {routine ? <ol>{routine.steps.map((step,index)=><li key={index}>{step}</li>)}</ol> : <p>{routineState?.state === "unavailable" ? "Your saved routine could not refresh. Try again before making changes." : "Choose what matters today. Build a simple rhythm for your presence, performance or wellbeing. Your Reserve begins wherever you are."}</p>}
          <div className="member-actions"><Link href={routineState?.state === "unavailable" ? "/home" : "/pathways#routine"} className="button button-gold">{routineState?.state === "unavailable" ? "Try again" : routine ? "Refine your routine" : "Find your direction"} ↗</Link><Link href="/my-reserve" className="text-link">Your preferences ↗</Link></div>
        </div><DigitalInstrument world={routine?.priority ?? "presence"} />
      </ImperialSurface>
      <section className="member-wellness" aria-labelledby="member-wellness-title"><div><p className="experience-kicker">LEGACY RESERVE VITALIS · FREE WELLNESS PILOT</p><h2 id="member-wellness-title">{foundation?.title ?? "A longer horizon. An everyday rhythm."}</h2><p>{wellnessState?.state === "unavailable" ? "Your wellness rhythm could not refresh. Try again before changing your saved choices." : foundation ? foundation.action : "Choose sleep consistency, everyday movement or meal preparation. Set your weekly target and return to your own progress."}</p><div className="member-actions"><Link href={wellnessState?.state === "unavailable" ? "/home" : "/vitalis/journey"} className="button button-gold">{wellnessState?.state === "unavailable" ? "Try again" : journey ? "Continue your wellness rhythm" : "Start your free wellness rhythm"} ↗</Link></div></div><div className="member-wellness-detail">{wellness && journey ? <><span className="digital-label">YOUR SAVED RHYTHM / {foundation?.label.toUpperCase()}</span><div className="member-week" aria-label="Your recorded wellness days this week">{wellness.week.map((day,index)=><span key={day} data-completed={journey.days.includes(day)} aria-label={`${day}: ${journey.days.includes(day) ? "marked complete" : "not marked"}`}>{["M","T","W","T","F","S","S"][index]}</span>)}</div><p className="member-week-progress">{completed} marked {completed === 1 ? "day" : "days"} this week · Target {journey.target}</p><p>Your recorded consistency, private to your customer account.</p></> : <><span className="digital-label">YOUR WELLBEING WORLD</span><p>The free pilot is available today. Advanced health intelligence and qualified clinical connections are the next horizon.</p></>}<Link href="/vitalis" className="text-link">Explore the Vitalis vision ↗</Link></div></section>
      {next || previous?.rebook_available || data.visits.state === "unavailable" ? <section className="member-focus" aria-labelledby="member-next-title">
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
                : "Sanctum, when a visit fits."}
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
                  : "Explore the physical houses and their availability when you want a visit. Your digital Reserve is here wherever you are."}
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
      </section> : <section className="member-line member-sanctum-shortcut"><div><p className="experience-kicker">SANCTUM / IN PERSON</p><h2>When a visit fits.</h2><p>Meet the professionals and explore the physical world.</p></div><Link className="text-link" href="/visit">Enter Sanctum ↗</Link></section>}
    </MemberShell>
  );
}
