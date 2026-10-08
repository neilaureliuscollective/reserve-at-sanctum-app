import type { Priority } from "@aethelios/concierge-core";

/** Public examples describe existing tools, never fabricated member measurements. */
export const digitalWorlds: {
  id: Priority; label: string; index: string; headline: string; description: string;
  focus: string; steps: string[]; href: string; action: string; glyph: string;
}[] = [
  { id: "presence", label: "Presence", index: "01", glyph: "P",
    headline: "Show up as yourself. At your best.",
    description: "A personal direction for your appearance, grooming and the way you carry yourself. Your standard starts at home.",
    focus: "A considered daily ritual", steps: ["Choose one appearance priority.", "Build a grooming rhythm you can keep.", "Keep your preferences in your Reserve."],
    href: "/pathways?priority=presence#routine", action: "Build your Presence routine" },
  { id: "performance", label: "Performance", index: "02", glyph: "↗",
    headline: "Build capacity. Keep your momentum.",
    description: "Give movement, recovery and preparation a place in your day. A simple routine you shape around your life.",
    focus: "A rhythm for your everyday capacity", steps: ["Choose a manageable movement priority.", "Make room for preparation and recovery.", "Save a routine that fits your week."],
    href: "/pathways?priority=performance#routine", action: "Build your Performance routine" },
  { id: "wellness", label: "Vitalis", index: "03", glyph: "V",
    headline: "Your wellbeing. A longer horizon.",
    description: "Start with a private wellness rhythm. Sleep consistency, everyday movement or meal preparation—with a weekly target you choose.",
    focus: "Your private wellness rhythm", steps: ["Choose one everyday wellness direction.", "Set a manageable weekly target.", "Mark your days and return to your rhythm."],
    href: "/vitalis/journey", action: "Start your free Vitalis rhythm" },
];
