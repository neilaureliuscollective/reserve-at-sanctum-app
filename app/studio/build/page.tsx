import { studioActor } from "@/lib/studio-session";
import { ReserveCommand } from "@/components/reserve-command";
export default async function Build({
  searchParams,
}: {
  searchParams: Promise<{ capture?: string; view?: string }>;
}) {
  const actor = await studioActor();
  const params = await searchParams;
  return (
    <ReserveCommand
      name={actor.name}
      owner={actor.role === "owner"}
      initialCapture={params.capture === "1"}
      initialReview={params.view === "review"}
    />
  );
}
