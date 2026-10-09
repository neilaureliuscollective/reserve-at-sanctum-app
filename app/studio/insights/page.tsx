import { studioActor } from "@/lib/studio-session";
import { hasCapability, requireCapability } from "@/lib/studio-permissions";
import { ProviderInsightsHome } from "@/components/provider-insights-home";
import { isPreview } from "@/lib/db";
export const metadata = { title: "Client continuity · Studio" };
export default async function Insights() {
  const actor = await studioActor();
  requireCapability(actor, "clients.read");
  requireCapability(actor, "appointments.read");
  return (
    <ProviderInsightsHome
      providerId={actor.provider_id || "katie"}
      preview={isPreview()}
      canManage={hasCapability(actor, "appointments.manage")}
    />
  );
}
