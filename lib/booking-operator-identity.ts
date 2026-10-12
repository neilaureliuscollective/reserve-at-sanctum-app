import type { Actor } from "./booking";

/** Presentation of existing verified scope only. This never grants business authority. */
export function operatorIdentity(actor: Pick<Actor, "role" | "provider_id">) {
  if (actor.role === "owner") {
    return { affiliation: "PLATFORM · OPERATIONS", customerLabel: "View Fix It Shop" };
  }
  if (actor.provider_id === "katie") {
    return { affiliation: "FIX IT SHOP · KATIE’S STUDIO", customerLabel: "View your customer app" };
  }
  return { affiliation: "PROVIDER · OPERATIONS", customerLabel: "View Fix It Shop" };
}
