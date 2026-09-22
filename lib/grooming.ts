export type GroomingBlueprint = {
  focus: string[];
  maintenance: string;
  skin: string;
  hair: string;
  beard: string;
  direction: string;
  ritual: string[];
};

export type GroomingProfile = {
  user_id: string;
  focus: string[];
  maintenance: string;
  skin: string;
  hair: string;
  beard: string;
  blueprint: GroomingBlueprint;
  scan_completed_at: string | null;
  updated_at: string;
};

export type GroomingDraft = Omit<
  GroomingProfile,
  "user_id" | "scan_completed_at" | "updated_at"
>;

export const GROOMING_DRAFT_KEY = "reserve:grooming-blueprint";

export function buildGroomingBlueprint(
  input: Omit<GroomingDraft, "blueprint">,
): GroomingDraft {
  const direction = input.focus.includes("Sharper beard structure")
    ? "Build the look around a deliberate beard line and balanced silhouette, then let the haircut reinforce the face rather than compete with it."
    : "Lead with a haircut direction that strengthens proportion and feels composed between visits, then align skin and facial-hair care around it.";
  const ritual = [
    input.skin === "Redness or irritation"
      ? "Use a calm, low-friction cleansing and post-grooming routine."
      : "Begin with a consistent cleanse suited to your visible skin priorities.",
    input.beard === "Clean shaven"
      ? "Protect the skin barrier before and after shaving."
      : "Condition facial hair and the skin beneath it every day.",
    input.maintenance === "Five minutes or less"
      ? "Keep the daily sequence to three repeatable steps."
      : "Use a deliberate morning ritual and a lighter evening reset.",
  ];
  return { ...input, blueprint: { ...input, direction, ritual } };
}
