import { redirect } from "next/navigation";
import { currentUser } from "./auth";
import { requireCapability } from "./studio-permissions";
export async function studioActor() {
  const actor = await currentUser();
  if (!actor) redirect("/signin?next=/studio");
  if (actor.role === "client") redirect("/account");
  requireCapability(actor, "studio.read");
  return actor;
}
