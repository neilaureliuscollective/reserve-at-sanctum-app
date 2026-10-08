import { z } from "zod";
export const journeyNotice = "vitalis-pilot-2026-10-08";
export const directions = ["sleep", "movement", "meal-planning"] as const;
export const foundations = {
  sleep: {
    label: "Sleep consistency",
    title: "Give recovery a rhythm.",
    action:
      "Choose a realistic wind-down time and prepare a quieter space for tonight.",
    extended:
      "Put tomorrow’s essentials in place, then step away from screens as you wind down.",
    reason:
      "CDC recommends consistent sleep and wake times. This is a habit prompt, not a sleep assessment.",
    source: "https://www.cdc.gov/sleep/about/index.html",
    sourceLabel: "CDC · About Sleep",
  },
  movement: {
    label: "Everyday movement",
    title: "Make room to move.",
    action:
      "Choose a comfortable movement break that fits your ability and schedule.",
    extended:
      "Plan where a second comfortable movement break could fit tomorrow. Keep training in Performance.",
    reason:
      "CDC advises starting with activity that suits your abilities and building gradually. This is not an exercise prescription.",
    source:
      "https://www.cdc.gov/physical-activity-basics/guidelines/adults.html",
    sourceLabel: "CDC · Adult Activity",
  },
  "meal-planning": {
    label: "Meal preparation",
    title: "Prepare a better default.",
    action:
      "Choose one meal to prepare ahead and make a short shopping or preparation plan.",
    extended:
      "Set out what you need for that meal and choose a practical time to prepare it.",
    reason:
      "Planning small, realistic actions can help build habits. Your food choices remain yours; no calorie or medical diet target is assigned.",
    source:
      "https://www.niddk.nih.gov/health-information/diet-nutrition/changing-habits-better-health",
    sourceLabel: "NIDDK · Changing Habits for Better Health",
  },
} as const;
export const journeyInput = z
  .object({
    direction: z.enum(directions),
    minutes: z.union([z.literal(5), z.literal(10), z.literal(20)]),
    target: z.number().int().min(1).max(7),
    revision: z.number().int().nonnegative(),
    adult: z.literal(true),
    consent: z.literal(true),
    noticeVersion: z.literal(journeyNotice),
  })
  .strict();
export const checkInput = z
  .object({ revision: z.number().int().positive(), completed: z.boolean() })
  .strict();
export const clearInput = z
  .object({ revision: z.number().int().positive() })
  .strict();
export type Journey = {
  active: boolean;
  direction: (typeof directions)[number] | null;
  minutes: 5 | 10 | 20 | null;
  target: number | null;
  days: string[];
  revision: number;
  started_on: string | null;
};
export type JourneyView = {
  journey: Journey | null;
  today: string;
  week: string[];
};
export const pilotBoundary = Object.freeze({
  paid: false,
  clinical: false,
  discounts: false,
});
