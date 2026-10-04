import { chairSchema } from "./chair-validation";
import type { Database } from "./db";
import { BookingError, type Actor } from "./booking";
import { consentFiltered, type ChairProfile, type ChairCard } from "./chair";
import { assignments, permitted } from "../domains/access";
import { z } from "zod";

export const canReadChairStudio = (actor: Actor) => assignments(actor).some(a=>a.role==="provider");
const allowedProvider = (actor:Actor, providerId:string) => assignments(actor).some(a=>a.role==="provider"&&a.provider_id===providerId);
const selection = `p.*, COALESCE(c.life,'') AS life, COALESCE(c.load,'') AS load, c.expires_at AS life_expires_at`;
const contextJoin = `LEFT JOIN reserve_chair_context c ON c.user_id=p.user_id AND c.expires_at>now() AND p.share_with_katie=true`;
async function purgeExpired(db: Database) {
  // Read predicates always exclude expired data even before this opportunistic cleanup.
  await db.query("DELETE FROM reserve_chair_context WHERE expires_at<=now()");
}
export async function getChair(db: Database, actor: Actor) {
  await purgeExpired(db);
  return (
    (
      await db.query<ChairProfile>(
        `SELECT ${selection} FROM reserve_chair_profiles p ${contextJoin} WHERE p.user_id=$1`,
        [actor.id],
      )
    )[0] || null
  );
}
export async function saveChair(db: Database, actor: Actor, raw: unknown) {
  const input = consentFiltered(chairSchema.parse(raw));
  const providers=await db.query("SELECT id FROM reserve_providers WHERE id=$1 AND enabled",[input.provider_id]);
  if(!providers.length)throw new BookingError("Choose an available provider.");
  await db.transaction(async (tx) => {
    const rows = await tx.query(
      `INSERT INTO reserve_chair_profiles
      (user_id,intent,conversation,goal,maintenance,length,beard,detail,share_with_katie,provider_id)
      SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$11 WHERE $10=0 OR EXISTS(SELECT 1 FROM reserve_chair_profiles WHERE user_id=$1)
      ON CONFLICT(user_id) DO UPDATE SET intent=excluded.intent,conversation=excluded.conversation,
      goal=excluded.goal,maintenance=excluded.maintenance,length=excluded.length,beard=excluded.beard,
      detail=excluded.detail,share_with_katie=excluded.share_with_katie,provider_id=excluded.provider_id,revision=reserve_chair_profiles.revision+1,updated_at=now()
      WHERE reserve_chair_profiles.revision=$10 RETURNING user_id`,
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
        input.provider_id,
      ],
    );
    if (!rows.length)
      throw new BookingError(
        "Your saved Chair changed in another tab. Reload before saving again.",
        409,
      );
    await tx.query("DELETE FROM reserve_chair_context WHERE user_id=$1", [
      actor.id,
    ]);
    if (input.life)
      await tx.query(
        "INSERT INTO reserve_chair_context(user_id,life,load) VALUES($1,$2,$3)",
        [actor.id, input.life, input.load],
      );
  });
  return getChair(db, actor);
}
export async function deleteChair(db: Database, actor: Actor) {
  await db.query("DELETE FROM reserve_chair_profiles WHERE user_id=$1", [
    actor.id,
  ]);
}
export async function listChairs(db: Database, actor: Actor) {
  // Owner/manager financial access does not imply access to private hospitality context.
  const providers=assignments(actor).filter(a=>a.role==="provider").map(a=>a.provider_id);
  if(!providers.length)throw new BookingError("Assigned provider access is required.",403);
  await purgeExpired(db);
  return db.query<ChairCard>(`SELECT ${selection},u.name AS client_name,COALESCE(n.body,'') AS service_note,COALESCE(n.revision,0) AS note_revision
    FROM reserve_chair_profiles p JOIN reserve_users u ON u.id=p.user_id ${contextJoin}
    LEFT JOIN reserve_chair_notes n ON n.user_id=p.user_id AND n.provider_id=p.provider_id
    WHERE p.share_with_katie=true AND p.provider_id=ANY($1::text[])
      AND EXISTS(SELECT 1 FROM reserve_appointments a WHERE a.client_id=p.user_id AND a.provider_id=p.provider_id AND a.location_id=ANY($2::text[]) AND a.status IN ('confirmed','checked_in','completed'))
    ORDER BY p.updated_at DESC LIMIT 100`,[providers,assignments(actor).filter(a=>a.role==="provider").map(a=>a.location_id)]);
}
const noteSchema = z
  .object({
    provider_id: z.string().max(100).default("katie"),
    user_id: z.string().min(1).max(100),
    body: z.string().trim().max(600),
    revision: z.number().int().min(0),
  })
  .strict();
export async function saveChairNote(db: Database, actor: Actor, raw: unknown) {
  const input = noteSchema.parse(raw);
  if(!allowedProvider(actor,input.provider_id))throw new BookingError("Assigned provider access is required.",403);
  await db.transaction(async (tx) => {
    const shared = await tx.query(
      "SELECT user_id FROM reserve_chair_profiles WHERE user_id=$1 AND share_with_katie=true AND provider_id=$2 AND EXISTS(SELECT 1 FROM reserve_appointments a WHERE a.client_id=$1 AND a.provider_id=$2 AND a.location_id=ANY($3::text[]) AND a.status IN ('confirmed','checked_in','completed')) FOR UPDATE",
      [input.user_id,input.provider_id,assignments(actor).filter(a=>a.role==="provider"&&a.provider_id===input.provider_id).map(a=>a.location_id)],
    );
    if (!shared.length)
      throw new BookingError(
        "This client has not shared a Chair check-in.",
        404,
      );
    const rows = await tx.query(
      `INSERT INTO reserve_chair_notes(user_id,provider_id,author_id,body)
      VALUES($1,$5,$2,$3) ON CONFLICT(user_id,provider_id) DO UPDATE SET body=excluded.body,author_id=excluded.author_id,
      updated_at=now(),revision=reserve_chair_notes.revision+1 WHERE reserve_chair_notes.revision=$4 RETURNING revision`,
      [input.user_id, actor.id, input.body, input.revision,input.provider_id],
    );
    if (!rows.length)
      throw new BookingError(
        "This service note changed. Reload before editing it.",
        409,
      );
  });
}
