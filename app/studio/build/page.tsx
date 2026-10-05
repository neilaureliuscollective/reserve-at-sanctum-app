import { studioActor } from "@/lib/studio-session";
import { database } from "@/lib/db";
import { canAccess, type Appointment } from "@/lib/booking";
import { requireCapability } from "@/lib/studio-permissions";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ReserveCommand } from "@/components/reserve-command";
export default async function Build({
  searchParams,
}: {
  searchParams: Promise<{ capture?: string; view?: string; followup?: string }>;
}) {
  const actor = await studioActor();
  const params = await searchParams;
  let reference = "";
  if (params.followup) {
    requireCapability(actor, "appointments.read");
    if (!z.uuid().safeParse(params.followup).success) notFound();
    const [visit] = await (
      await database()
    ).query<Appointment>("SELECT * FROM reserve_appointments WHERE id=$1", [
      params.followup,
    ]);
    if (!visit || visit.status !== "completed" || !canAccess(actor, visit))
      notFound();
    reference = visit.id.slice(0, 8).toUpperCase();
  }
  return (
    <ReserveCommand
      name={actor.name}
      owner={actor.role === "owner"}
      initialCapture={params.capture === "1"}
      initialReview={params.view === "review"}
      initialTask={Boolean(reference)}
      initialTitle={reference ? `Follow-up · visit ${reference}` : ""}
      initialDetail={
        reference
          ? `Review visit ${reference} and decide whether follow-up is needed. This is an internal task; no message has been sent.`
          : ""
      }
    />
  );
}
