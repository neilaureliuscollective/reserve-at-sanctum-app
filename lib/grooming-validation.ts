import { z } from 'zod';
export const groomingDraftSchema = z.object({
  focus: z.array(z.string().min(1).max(80)).min(1).max(5),
  maintenance: z.string().min(1).max(80), skin: z.string().min(1).max(80),
  hair: z.string().min(1).max(80), beard: z.string().min(1).max(80),
  blueprint: z.object({
    focus: z.array(z.string().min(1).max(80)).min(1).max(5),
    maintenance: z.string().min(1).max(80), skin: z.string().min(1).max(80),
    hair: z.string().min(1).max(80), beard: z.string().min(1).max(80),
    direction: z.string().min(1).max(300), ritual: z.array(z.string().min(1).max(180)).min(1).max(6),
  }),
});
export const groomingHandoffSchema = z.object({
  version: z.literal(1), owner: z.string().min(1).max(100).nullable(),
  expires: z.number().finite(), value: groomingDraftSchema,
});
export function readGroomingHandoff(raw: string | null, userId: string, now = Date.now()) {
  if (!raw) return null;
  try {
    const parsed = groomingHandoffSchema.safeParse(JSON.parse(raw));
    if (!parsed.success || parsed.data.expires <= now || (parsed.data.owner !== null && parsed.data.owner !== userId)) return null;
    return parsed.data.value;
  } catch { return null; }
}
