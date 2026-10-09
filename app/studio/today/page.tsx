import { studioActor } from "@/lib/studio-session";
import { ProviderDayHome } from "@/components/provider-day-home";
import { hasCapability } from "@/lib/studio-permissions";
import { isPreview } from "@/lib/db";
export const metadata = { title: "Your working day · Studio" };
export default async function Today() {
  const actor = await studioActor();
  return (
    <ProviderDayHome
      providerId={actor.provider_id || "katie"}
      preview={isPreview()}
      canManage={hasCapability(actor, "appointments.manage")}
      canClients={hasCapability(actor, "clients.read")}
      canBlocks={hasCapability(actor, "blocks.manage")}
    />
  );
}
