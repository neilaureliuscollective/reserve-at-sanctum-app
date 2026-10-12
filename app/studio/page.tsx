import { redirect } from "next/navigation";
import { StudioRefresh } from "@/components/studio-refresh";
import { FounderCommand } from "@/components/founder-command";
import { studioActor } from "@/lib/studio-session";
import { database } from "@/lib/db";
import { founderCommand } from "@/lib/founder-command";
export default async function StudioHome() {
  const actor=await studioActor();
  if(actor.role!=="owner")
    redirect("/studio/today");
  let data: Awaited<ReturnType<typeof founderCommand>>|null=null;
  try {
    data=await founderCommand(await database(),actor);
  }
  catch { /* Never log database errors or infer readiness. */ }
  return <>
    <StudioRefresh />
    <FounderCommand data={data} />
  </>;
}
