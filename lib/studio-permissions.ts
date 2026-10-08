import type { Actor } from "./booking";
import { BookingError } from "./booking-error";
export const capabilities = [
  "studio.read",
  "workspace.read",
  "workspace.create",
  "workspace.edit",
  "workspace.request_review",
  "workspace.approve",
  "appointments.read",
  "appointments.manage",
  "blocks.manage",
  "clients.read",
  "chair.read",
  "chair.notes.write",
  "operations.configure",
  "finance.read",
  "users.admin",
] as const;
export type Capability = (typeof capabilities)[number];
export type CapabilityOverride = {
  capability: string;
  decision: "allow" | "deny";
  scope: "company" | "shared" | "provider" | "assigned";
};
const operational: Capability[] = [
  "studio.read",
  "workspace.read",
  "workspace.create",
  "workspace.edit",
  "workspace.request_review",
  "appointments.read",
  "appointments.manage",
  "blocks.manage",
  "clients.read",
  "chair.read",
  "chair.notes.write",
];
export function isTeam(actor: Actor | null): actor is Actor {
  return !!actor && ["owner", "operator", "staff"].includes(actor.role);
}
export function capabilityScope(
  actor: Actor,
  capability: Capability,
): CapabilityOverride["scope"] | null {
  if (!capabilities.includes(capability) || !isTeam(actor)) return null;
  if (actor.role === "owner") return "company";
  if (
    [
      "workspace.approve",
      "users.admin",
      "finance.read",
      "operations.configure",
    ].includes(capability)
  )
    return null;
  const overrides = actor.capability_overrides ?? [];
  if (
    overrides.some((x) => x.capability === capability && x.decision === "deny")
  )
    return null;
  const grant = overrides.find(
    (x) => x.capability === capability && x.decision === "allow",
  );
  // Non-owner grants can narrow defaults, never manufacture company authority.
  const defaultScope = capability.startsWith("workspace.")
    ? actor.role === "operator"
      ? "shared"
      : "assigned"
    : capability === "studio.read"
      ? "assigned"
      : "provider";
  if (
    grant &&
    grant.scope !== defaultScope &&
    !(capability.startsWith("workspace.") && grant.scope === "assigned")
  )
    return null;
  if (!operational.includes(capability)) return null;
  if (defaultScope === "provider" && !actor.provider_id) return null;
  return grant?.scope ?? defaultScope;
}
export const hasCapability = (actor: Actor, capability: Capability) =>
  capabilityScope(actor, capability) !== null;
export function requireCapability(actor: Actor, capability: Capability) {
  if (!hasCapability(actor, capability))
    throw new BookingError(
      "This action requires Studio access and the appropriate permission.",
      403,
    );
}
