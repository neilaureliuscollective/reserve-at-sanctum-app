export const chairChoices = {
  intent: [
    "Clean me up.",
    "Switch it up.",
    "I need a reset.",
    "Getting ready for something.",
    "Keep what works.",
    "Katie, take the wheel.",
  ],
  life: [
    "Yeah. I’m good.",
    "Mostly.",
    "Got a lot going on.",
    "Been better.",
    "Just getting cleaned up today.",
  ],
  load: [
    "Work",
    "Money",
    "Family",
    "Relationship",
    "Health",
    "My head",
    "What’s next",
    "A little of everything",
  ],
  conversation: [
    "Talk with me.",
    "Keep it light.",
    "Let me vent.",
    "Give me some quiet.",
    "Let it happen naturally.",
  ],
  goal: [
    "Sharper.",
    "Cleaner.",
    "More professional.",
    "More confident.",
    "Something different.",
    "Easy to maintain.",
    "Katie, take the wheel.",
  ],
  maintenance: [
    "Wash and go",
    "Five minutes or less",
    "I’ll put the time in",
    "Let’s work it out",
  ],
  length: ["Short", "Medium", "Longer", "Growing it out"],
  beard: ["Clean shaven", "Stubble", "Beard", "Let’s talk about it"],
} as const;
export type ChairInput = {
  intent: (typeof chairChoices.intent)[number];
  conversation: (typeof chairChoices.conversation)[number];
  goal: (typeof chairChoices.goal)[number];
  maintenance: "" | (typeof chairChoices.maintenance)[number];
  length: "" | (typeof chairChoices.length)[number];
  beard: "" | (typeof chairChoices.beard)[number];
  detail: string;
  life: "" | (typeof chairChoices.life)[number];
  load: "" | (typeof chairChoices.load)[number];
  share_with_katie: boolean;
  save_life: boolean;
  revision: number;
};
export type ChairProfile = Omit<ChairInput, "save_life"> & {
  user_id: string;
  updated_at: string;
  life_expires_at: string | null;
};
export type ChairCard = ChairProfile & {
  client_name: string;
  service_note: string;
  note_revision: number;
};
export const emptyChair: ChairInput = {
  intent: "Clean me up.",
  conversation: "Let it happen naturally.",
  goal: "Sharper.",
  maintenance: "",
  length: "",
  beard: "",
  detail: "",
  life: "",
  load: "",
  share_with_katie: false,
  save_life: false,
  revision: 0,
};
export const needsLoad = (life: string) =>
  life === "Got a lot going on." || life === "Been better.";
export function consentFiltered(input: ChairInput): ChairInput {
  return {
    ...input,
    life: input.save_life && input.share_with_katie ? input.life : "",
    load:
      input.save_life && input.share_with_katie && needsLoad(input.life)
        ? input.load
        : "",
  };
}
export const CHAIR_DRAFT_KEY = "reserve:chair-draft:v1";
export const chairEvents = [
  "started",
  "grooming_completed",
  "preference_selected",
  "completed",
  "save_clicked",
  "oauth_google",
  "oauth_apple",
  "auth_returned",
  "saved",
  "booking_selected",
  "reopened",
] as const;
export type ChairEvent = (typeof chairEvents)[number];
export function trackChair(event: ChairEvent) {
  if (typeof window === "undefined") return;
  // Aggregate event names only. No identity, answer, text, URL or session token.
  void fetch("/api/chair/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event }),
    keepalive: true,
  }).catch(() => {});
}
export function chairSummary(
  input: Pick<
    ChairInput,
    | "intent"
    | "goal"
    | "conversation"
    | "maintenance"
    | "length"
    | "beard"
    | "detail"
    | "life"
    | "load"
  >,
) {
  return [
    ["Cut", input.intent],
    ["Walk out", input.goal],
    ["Chair", input.conversation],
    ["Maintenance", input.maintenance],
    ["Current length", input.length],
    ["Facial hair", input.beard],
    ["Grooming detail", input.detail],
    ["Life today", input.life],
    ["Taking energy", input.load],
  ].filter(([, value]) => Boolean(value));
}
