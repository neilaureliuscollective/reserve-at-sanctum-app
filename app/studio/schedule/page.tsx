import {
  PilotAppointmentForm,
  PilotMessages,
} from "@/components/booking-pilot";
import { studioActor } from "@/lib/studio-session";
import { isPreview } from "@/lib/db";
import { Visits } from "@/components/visits";
import { StudioBlocks } from "@/components/studio-blocks";
import { ChairStudio } from "@/components/chair-studio";
import { canReadChairStudio } from "@/lib/chair-store";
import { hasCapability } from "@/lib/studio-permissions";
export default async function Schedule({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    location?: string;
    service?: string;
    time?: string;
    add?: string;
    provider?: string;
  }>;
}) {
  const p = await searchParams;
  const date =
    p.date && /^\d{4}-\d{2}-\d{2}$/.test(p.date) ? p.date : undefined;
  const actor = await studioActor();
  return (
    <>
      <header className="studio-title">
        <p className="eyebrow">
          {actor.provider_id === "katie"
            ? "FIX IT SHOP · YOUR CALENDAR"
            : "THE WORKING DAY"}
        </p>
        <h1>
          Time, <em>well placed.</em>
        </h1>
        <p>
          {actor.role === "owner"
            ? "The shared appointment book, powered by Aethelios Booking."
            : "Your provider schedule and the clients you’re here to serve."}
        </p>
      </header>
      <section id="schedule">
        <div id="manual-booking">
          <PilotAppointmentForm
            key={[date, p.location, p.service, p.time, p.add].join(":")}
            providerId={
              actor.provider_id ||
              (actor.role === "owner" ? p.provider || "" : "")
            }
            initial={{
              date,
              location: p.location,
              service: p.service,
              start: p.time,
              open: p.add === "1",
            }}
          />
        </div>
        <PilotMessages />
        <Visits
          key={[date, p.location].join(":")}
          actor={actor}
          studio
          preview={isPreview()}
          initialDate={date}
          initialLocation={p.location}
        />
      </section>
      {hasCapability(actor, "blocks.manage") && (
        <section id="availability">
          <StudioBlocks />
        </section>
      )}
      {canReadChairStudio(actor) && <ChairStudio />}
    </>
  );
}
