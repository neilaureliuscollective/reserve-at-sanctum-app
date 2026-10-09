import { studioActor } from "@/lib/studio-session";
import { PilotClients } from "@/components/booking-pilot";
import Link from "next/link";
import { hasCapability } from "@/lib/studio-permissions";
export default async function Clients() {
  const actor = await studioActor();
  return (
    <>
      {actor.provider_id && hasCapability(actor, "clients.read") && (
        <Link className="studio-inline" href="/studio/insights">
          Client continuity · visit insights & follow-up list ↗
        </Link>
      )}
      <PilotClients providerId={actor.provider_id || ""} />
    </>
  );
}
