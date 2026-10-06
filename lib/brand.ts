/** Public Legacy Reserve identity. Internal table names stay reserve_*. */
export const brand = {
  name: "Legacy Reserve",
  legal: "Legacy Reserve",
  shortName: "Legacy Reserve",
  wordmark: "LEGACY RESERVE",
  appleTitle: "Legacy Reserve",
  tagline: "A standard a man can return to.",
  description:
    "A premium men's institution for appearance, grooming, membership, products, and the care between visits.",
  titleDefault: "Legacy Reserve — A standard a man can return to.",
  titleTemplate: "%s · Legacy Reserve",
  enterCta: "Enter the Reserve",
  mark: "/brand/legacy-reserve/mark-gold.svg",
  ceremonial: "/brand/legacy-reserve/mark-ceremonial.svg",
  appIcon180: "/brand/legacy-reserve/app-icon-180.png",
  appIcon192: "/brand/legacy-reserve/app-icon-192.png",
  appIcon512: "/brand/legacy-reserve/app-icon-512.png",
  appIconMaskable: "/brand/legacy-reserve/app-icon-maskable-512.png",
  openGraph: "/brand/legacy-reserve/open-graph.png",
  themeColor: "#0B1610",
  backgroundColor: "#070908",
} as const;

export function locationLabel(city: string) {
  return `Legacy Reserve — ${city}`;
}
