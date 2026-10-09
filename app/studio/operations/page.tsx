import { PilotReadiness } from "@/components/booking-pilot";
import { studioActor } from "@/lib/studio-session";
import { database } from "@/lib/db";
import { operationOverview } from "@/lib/studio-operations";
import { StudioOperations } from "@/components/studio-operations";
export default async function Operations({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const actor = await studioActor(),
    params = await searchParams;
  return (
    <>
      <PilotReadiness />
      <StudioOperations
        initial={await operationOverview(await database(), actor)}
        actorId={actor.id}
        initialView={
          ["menu", "availability", "review"].includes(params.view || "")
            ? params.view
            : "menu"
        }
      />
    </>
  );
}
