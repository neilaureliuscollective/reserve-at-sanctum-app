import { z } from "zod";
import { chairChoices } from "./chair";
const optionalChoice = <T extends readonly [string, ...string[]]>(values: T) =>
  z.union([z.literal(""), z.enum(values)]);
export const chairSchema = z
  .object({
    intent: z.enum(chairChoices.intent),
    conversation: z.enum(chairChoices.conversation),
    goal: z.enum(chairChoices.goal),
    maintenance: optionalChoice(chairChoices.maintenance),
    length: optionalChoice(chairChoices.length),
    beard: optionalChoice(chairChoices.beard),
    detail: z.string().trim().max(240),
    life: optionalChoice(chairChoices.life),
    load: optionalChoice(chairChoices.load),
    share_with_katie: z.boolean(),
    save_life: z.boolean(),
    revision: z.number().int().min(0),
  })
  .strict();
