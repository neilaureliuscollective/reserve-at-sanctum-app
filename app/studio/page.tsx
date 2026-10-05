import { StudioRefresh } from "@/components/studio-refresh";
import { StudioCommandHome } from "@/components/studio-command-home";
import { studioActor } from "@/lib/studio-session";
import { database } from "@/lib/db";
import { studioOverview } from "@/lib/command-center";
export default async function StudioHome() {
  const actor = await studioActor();
  const data = await studioOverview(await database(), actor);
  return (
    <>
      <StudioRefresh />
      <StudioCommandHome
        data={data}
        owner={actor.role === "owner"}
        operator={actor.role === "operator"}
      />
    </>
  );
}
