import { studioActor } from "@/lib/studio-session";
import { PilotClients } from "@/components/booking-pilot";
export default async function Clients() {
  const actor = await studioActor();
  return <PilotClients providerId={actor.provider_id || ""} />;
}
