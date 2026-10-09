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
export default async function Schedule() {
  const actor = await studioActor();
  return (
    <>
      <header className="studio-title">
        <p className="eyebrow">THE WORKING DAY</p>
        <h1>
          Time, <em>well placed.</em>
        </h1>
        <p>
          {actor.role === "owner"
            ? "The Reserve appointment book."
            : "Your provider schedule and the clients you’re here to serve."}
        </p>
      </header>
      <section id="schedule">
        <PilotAppointmentForm providerId={actor.provider_id || ""} />
        <PilotMessages />
        <Visits actor={actor} studio preview={isPreview()} />
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
