import { database } from "@/lib/db";
import { memberRead } from "@/lib/experience/member";
import { sanctumDirectory } from "@/lib/experience/sanctum-directory";
import { SanctumHub } from "@/components/experience/sanctum-hub";
export const dynamic = "force-dynamic";
export const metadata = { title: "Sanctum · Legacy Reserve" };
export default async function Page({ searchParams }: { searchParams: Promise<{ location?: string }> }) {
  const { location } = await searchParams;
  const state = await memberRead(async () => sanctumDirectory(await database()));
  return <SanctumHub destinations={state.data ?? []} initialLocation={location} unavailable={state.state === "unavailable"}/>;
}
