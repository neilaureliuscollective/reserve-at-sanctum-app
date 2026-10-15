import { database } from "./db";
import { businessEntrance } from "./business-workspace";
import { redirect } from "next/navigation";
import { currentUser } from "./auth";
import { requireCapability } from "./studio-permissions";
export async function studioActor() {
  const actor = await currentUser();
  if (!actor) redirect("/signin?next=/studio");
  const entrance = await businessEntrance(await database(), actor);
  if (entrance && actor.role !== "owner") redirect(entrance);
  if (actor.role === "client") redirect("/account");
  requireCapability(actor, "studio.read");
  return actor;
}
