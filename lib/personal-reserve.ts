import { z } from "zod";
import { BookingError, type Actor } from "./booking";
import type { Database, Queryable, Row } from "./db";
export const routineInput = z
  .object({
    priority: z.enum(["presence", "performance", "wellness"]),
    title: z.string().trim().min(1).max(80),
    steps: z.array(z.string().trim().min(1).max(240)).min(1).max(6),
    revision: z.number().int().nonnegative(),
  })
  .strict();
export type SavedRoutine = Row & {
  priority: "presence" | "performance" | "wellness";
  title: string;
  steps: string[];
  revision: number;
  cleared: boolean;
};
export function requireMember(actor: Actor | null): asserts actor is Actor {
  if (!actor) throw new BookingError("Sign in to your Reserve.", 401);
  if (actor.role !== "client")
    throw new BookingError(
      "This experience is reserved for customer accounts.",
      403,
    );
}
export async function readRoutine(db: Queryable, actor: Actor) {
  requireMember(actor);
  const [row] = await db.query<SavedRoutine>(
    "SELECT priority,title,steps,revision,cleared FROM reserve_member_routines WHERE user_id=$1",
    [actor.id],
  );
  return row ?? null;
}
export async function saveRoutine(db: Database, actor: Actor, input: unknown) {
  requireMember(actor);
  const i = routineInput.parse(input);
  return db.transaction(async (tx) => {
    const [row] = await tx.query<SavedRoutine>(
      `INSERT INTO reserve_member_routines(user_id,priority,title,steps)
 SELECT $1,$2,$3,$4::jsonb WHERE $5::integer=0
 ON CONFLICT(user_id) DO NOTHING RETURNING priority,title,steps,revision,cleared`,
      [actor.id, i.priority, i.title, JSON.stringify(i.steps), i.revision],
    );
    if (row) return row;
    const [updated] = await tx.query<SavedRoutine>(
      `UPDATE reserve_member_routines SET priority=$2,title=$3,steps=$4::jsonb,cleared=false,revision=revision+1,updated_at=now()
 WHERE user_id=$1 AND revision=$5 RETURNING priority,title,steps,revision,cleared`,
      [actor.id, i.priority, i.title, JSON.stringify(i.steps), i.revision],
    );
    if (!updated)
      throw new BookingError(
        "Your routine changed. Refresh before saving again.",
        409,
      );
    return updated;
  });
}
export async function clearRoutine(
  db: Queryable,
  actor: Actor,
  revision: number,
) {
  requireMember(actor);
  const [row] = await db.query<SavedRoutine>(
    `UPDATE reserve_member_routines SET cleared=true,title='Your routine',steps='[]'::jsonb,revision=revision+1,updated_at=now() WHERE user_id=$1 AND revision=$2 RETURNING priority,title,steps,revision,cleared`,
    [actor.id, revision],
  );
  if (!row)
    throw new BookingError(
      "Your routine changed. Refresh before clearing it.",
      409,
    );
  return row;
}
