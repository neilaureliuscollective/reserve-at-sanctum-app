import { isFixItApp } from "./app-edition";
import { redirect } from "next/navigation";
import { currentUser } from "./auth";
import { requireCapability } from "./studio-permissions";
export async function studioActor() {
  const actor = await currentUser();
  if (!actor) redirect(isFixItApp() ? "/fix-it-shop/app/signin?next=%2Fstudio%2Ftoday" : "/signin?next=/studio");
  if (actor.role === "client") redirect("/account");
  requireCapability(actor, "studio.read");
  return actor;
}
