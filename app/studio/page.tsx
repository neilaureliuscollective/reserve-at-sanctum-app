import { redirect } from "next/navigation";
import { StudioRefresh } from "@/components/studio-refresh";
import { FounderCommand } from "@/components/founder-command";
import { studioActor } from "@/lib/studio-session";
import { database } from "@/lib/db";
import { founderCommand } from "@/lib/founder-command";
import { founderOverview } from "@/lib/founder-overview";
import { FounderOverview } from "@/components/founder-overview";
export default async function StudioHome() {
  const actor=await studioActor();
  if(actor.role!=="owner")
    redirect("/studio/today");
  let data: Awaited<ReturnType<typeof founderCommand>>|null=null;
  let overview: Awaited<ReturnType<typeof founderOverview>>|null=null;
  try {
    const db = await database();
    [data, overview] = await Promise.all([founderCommand(db,actor), founderOverview(db,actor)]);
  }
  catch { /* Never log database errors or infer readiness. */ }
  return <>
    <StudioRefresh />
    <FounderCommand data={data} overview={<FounderOverview data={overview} />} />
  </>;
}
