/** Public Legacy Reserve identity. Internal table names stay reserve_*. */
export const brand = {
  name: "Legacy Reserve",
  legal: "Legacy Reserve",
  shortName: "Legacy Reserve",
  wordmark: "LEGACY RESERVE",
  appleTitle: "Legacy Reserve",
  tagline: "A standard to return to.",
  description:
    "A premium lifestyle ecosystem for presence, performance, wellbeing, personal routines, and digital membership, wherever you are.",
  titleDefault: "Legacy Reserve — A standard to return to.",
  titleTemplate: "%s · Legacy Reserve",
  enterCta: "Enter the Reserve",
  mark: "/brand/legacy-reserve/mark-gold.webp",
  ceremonial: "/brand/legacy-reserve/official-seal.webp",
  official: "/brand/legacy-reserve/official-seal.webp",
  appIcon180: "/brand/legacy-reserve/app-icon-180-imperial-v1.png",
  appIcon192: "/brand/legacy-reserve/app-icon-192-imperial-v1.png",
  appIcon512: "/brand/legacy-reserve/app-icon-512-imperial-v1.png",
  appIconMaskable: "/brand/legacy-reserve/app-icon-maskable-512-imperial-v1.png",
  favicon32: "/brand/legacy-reserve/favicon-32-imperial-v1.png",
  favicon48: "/brand/legacy-reserve/favicon-48-imperial-v1.png",
  openGraph: "/brand/legacy-reserve/open-graph.png",
  themeColor: "#12382D",
  backgroundColor: "#080D0B",
} as const;

export function locationLabel(city: string) {
  return `Fix It Shop — ${city}`;
}
