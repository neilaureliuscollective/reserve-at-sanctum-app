import { studioActor } from "@/lib/studio-session";
import { database } from "@/lib/db";
import { brandOverview } from "@/lib/provider-brands";
import {
  ProviderBrandStudio,
  type StudioBrandData,
} from "@/components/provider-brand-studio";
import "./brands.css";
export default async function Page() {
  const a = await studioActor();
  return (
    <ProviderBrandStudio
      initial={(await brandOverview(await database(), a)) as StudioBrandData}
    />
  );
}
