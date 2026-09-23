import { RESERVE_ORGANIZATION_ID as ORG } from "./tenancy";
import { chairSchema } from "./chair-validation";
import type { Database } from "./db";
import { BookingError, type Actor } from "./booking";
import { consentFiltered, type ChairProfile, type ChairCard } from "./chair";
import { z } from "zod";

export const canReadChairStudio = (actor: Actor) =>
  actor.organization_id === ORG && (actor.role === "owner" ||
  (actor.role === "staff" && actor.provider_id === "katie"));
const selection = `p.*, COALESCE(c.life,'') AS life, COALESCE(c.load,'') AS load, c.expires_at AS life_expires_at`;
const contextJoin = `LEFT JOIN reserve_chair_context c ON c.user_id=p.user_id AND c.organization_id=p.organization_id AND c.expires_at>now() AND p.share_with_katie=true`;
async function purgeExpired(db: Database, organizationId: string) {
  // Read predicates always exclude expired data even before this opportunistic cleanup.
  await db.query("DELETE FROM reserve_chair_context WHERE organization_id=$1 AND expires_at<=now()", [organizationId]);
}
export async function getChair(db: Database, actor: Actor) {
  await purgeExpired(db, actor.organization_id);
  return (
    (
      await db.query<ChairProfile>(
        `SELECT ${selection} FROM reserve_chair_profiles p ${contextJoin} WHERE p.user_id=$1 AND p.organization_id=$2`,
        [actor.id, actor.organization_id],
      )
    )[0] || null
  );
}
export async function saveChair(db: Database, actor: Actor, raw: unknown) {
  const input = consentFiltered(chairSchema.parse(raw));
  await db.transaction(async (tx) => {
    const rows = await tx.query(
      `INSERT INTO reserve_chair_profiles
      (user_id,intent,conversation,goal,maintenance,length,beard,detail,share_with_katie,organization_id)
      SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$11 WHERE $10=0 OR EXISTS(SELECT 1 FROM reserve_chair_profiles WHERE user_id=$1 AND organization_id=$11)
      ON CONFLICT(user_id) DO UPDATE SET intent=excluded.intent,conversation=excluded.conversation,
      goal=excluded.goal,maintenance=excluded.maintenance,length=excluded.length,beard=excluded.beard,
      detail=excluded.detail,share_with_katie=excluded.share_with_katie,revision=reserve_chair_profiles.revision+1,updated_at=now()
      WHERE reserve_chair_profiles.revision=$10 AND reserve_chair_profiles.organization_id=$11 RETURNING user_id`,
      [
        actor.id,
        input.intent,
        input.conversation,
        input.goal,
        input.maintenance,
        input.length,
        input.beard,
        input.detail,
        input.share_with_katie,
        input.revision,
        actor.organization_id,
      ],
    );
    if (!rows.length)
      throw new BookingError(
        "Your saved Chair changed in another tab. Reload before saving again.",
        409,
      );
    await tx.query("DELETE FROM reserve_chair_context WHERE user_id=$1 AND organization_id=$2", [
      actor.id, actor.organization_id,
    ]);
    if (input.life)
      await tx.query(
        "INSERT INTO reserve_chair_context(user_id,life,load,organization_id) VALUES($1,$2,$3,$4)",
        [actor.id, input.life, input.load, actor.organization_id],
      );
  });
  return getChair(db, actor);
}
export async function deleteChair(db: Database, actor: Actor) {
  await db.query("DELETE FROM reserve_chair_profiles WHERE user_id=$1 AND organization_id=$2", [
    actor.id, actor.organization_id,
  ]);
}
export async function listChairs(db: Database, actor: Actor) {
  if (!canReadChairStudio(actor))
    throw new BookingError("Katie’s studio access is required.", 403);
  await purgeExpired(db, actor.organization_id);
  return db.query<ChairCard>(`SELECT ${selection},u.name AS client_name,COALESCE(n.body,'') AS service_note,COALESCE(n.revision,0) AS note_revision
    FROM reserve_chair_profiles p JOIN reserve_users u ON u.id=p.user_id AND u.organization_id=p.organization_id ${contextJoin}
    LEFT JOIN reserve_chair_notes n ON n.user_id=p.user_id AND n.organization_id=p.organization_id AND n.provider_id='katie'
    WHERE p.share_with_katie=true AND p.organization_id=$1 ORDER BY p.updated_at DESC LIMIT 100`, [actor.organization_id]);
}
const noteSchema = z
  .object({
    user_id: z.string().min(1).max(100),
    body: z.string().trim().max(600),
    revision: z.number().int().min(0),
  })
  .strict();
export async function saveChairNote(db: Database, actor: Actor, raw: unknown) {
  if (!canReadChairStudio(actor))
    throw new BookingError("Katie’s studio access is required.", 403);
  const input = noteSchema.parse(raw);
  await db.transaction(async (tx) => {
    const shared = await tx.query(
      "SELECT user_id FROM reserve_chair_profiles WHERE user_id=$1 AND organization_id=$2 AND share_with_katie=true FOR UPDATE",
      [input.user_id, actor.organization_id],
    );
    if (!shared.length)
      throw new BookingError(
        "This client has not shared a Chair check-in.",
        404,
      );
    const rows = await tx.query(
      `INSERT INTO reserve_chair_notes(user_id,provider_id,author_id,body,organization_id)
      VALUES($1,'katie',$2,$3,$5) ON CONFLICT(user_id) DO UPDATE SET body=excluded.body,author_id=excluded.author_id,
      updated_at=now(),revision=reserve_chair_notes.revision+1 WHERE reserve_chair_notes.revision=$4 AND reserve_chair_notes.organization_id=$5 RETURNING revision`,
      [input.user_id, actor.id, input.body, input.revision, actor.organization_id],
    );
    if (!rows.length)
      throw new BookingError(
        "This service note changed. Reload before editing it.",
        409,
      );
  });
}
