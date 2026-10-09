/** Fixed by the independent app's build configuration, never by a request. */
export const isFixItApp = () => process.env.NEXT_PUBLIC_APP_EDITION === "fix-it-shop";
export const legacyOrigin = "https://www.reserveatsanctum.app";
export const fixItRelease = "fix-it-shop-independent-phase-1-20261009";
export function editionActor<T extends { role: string; provider_id: string | null }>(actor: T | null): T | null {
  if (!actor || !isFixItApp() || actor.role === "client") return actor;
  return actor.provider_id === "katie" && ["staff", "operator"].includes(actor.role) ? actor : null;
}
