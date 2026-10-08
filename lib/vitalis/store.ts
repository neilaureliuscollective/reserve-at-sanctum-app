import { randomUUID } from "node:crypto";
import type { Actor } from "../booking";
import { BookingError } from "../booking-error";
import type { Database, Queryable } from "../db";
import {
  interestInput,
  settingsInput,
  partnerInput,
  noticeVersion,
  type Interest,
  type Settings,
  type Partner,
} from "./validation";
export function requireVitalisMember(a: Actor | null): asserts a is Actor {
  if (!a) throw new BookingError("Sign in to your Reserve.", 401);
  if (a.role !== "client")
    throw new BookingError("Early access is for customer accounts.", 403);
}
export function requireVitalisOwner(a: Actor | null): asserts a is Actor {
  if (!a) throw new BookingError("Sign in to Studio.", 401);
  if (a.role !== "owner") throw new BookingError("Owner access required.", 403);
}
export async function readSettings(db: Queryable): Promise<Settings> {
  const [r] = await db.query<Settings & Record<string, unknown>>(
    "SELECT visible,registration_open,revision FROM reserve_vitalis_settings WHERE id='vitalis'",
  );
  if (!r) throw new BookingError("Vitalis registration is unavailable.", 503);
  return r;
}
export async function readInterest(
  db: Queryable,
  a: Actor,
): Promise<Interest | null> {
  requireVitalisMember(a);
  const [r] = await db.query<Interest & Record<string, unknown>>(
    "SELECT status,interests,region,outreach,revision FROM reserve_vitalis_interests WHERE user_id=$1",
    [a.id],
  );
  return r ?? null;
}
export async function event(db: Queryable, key: string) {
  await db.query(
    "INSERT INTO reserve_vitalis_funnel(day,event,count) VALUES(CURRENT_DATE,$1,1) ON CONFLICT(day,event) DO UPDATE SET count=LEAST(reserve_vitalis_funnel.count+1,1000000)",
    [key],
  );
}
export async function rate(
  db: Queryable,
  a: Actor,
  now = Date.now(),
  purpose: "mutation" | "event" = "mutation",
) {
  const bucket = Math.floor(now / 60000);
  const [r] = await db.query(
    "INSERT INTO reserve_vitalis_rate(user_id,purpose,bucket,requests) VALUES($1,$3,$2,1) ON CONFLICT(user_id,purpose) DO UPDATE SET bucket=$2,requests=CASE WHEN reserve_vitalis_rate.bucket=$2 THEN reserve_vitalis_rate.requests+1 ELSE 1 END WHERE reserve_vitalis_rate.bucket<>$2 OR reserve_vitalis_rate.requests<12 RETURNING user_id",
    [a.id, bucket, purpose],
  );
  if (!r)
    throw new BookingError("Please wait a minute before trying again.", 429);
}
async function consent(
  db: Queryable,
  id: string,
  purpose: string,
  decision: string,
) {
  await db.query(
    "INSERT INTO reserve_vitalis_consent_events(id,user_id,purpose,decision,notice_version) VALUES($1,$2,$3,$4,$5)",
    [randomUUID(), id, purpose, decision, noticeVersion],
  );
}
export async function saveInterest(
  db: Database,
  a: Actor,
  input: unknown,
  join = false,
) {
  requireVitalisMember(a);
  const i = interestInput.parse(input);
  return db.transaction(async (tx) => {
    // Lock account first: first joins and updates share one serialization boundary.
    await tx.query("SELECT id FROM reserve_users WHERE id=$1 FOR UPDATE", [
      a.id,
    ]);
    const settings = await readSettings(tx);
    const old = await readInterest(tx, a);
    const optout =
      old?.status === "active" &&
      old.outreach &&
      !i.outreach &&
      JSON.stringify(old.interests) === JSON.stringify(i.interests) &&
      old.region === i.region;
    if ((!settings.visible || !settings.registration_open) && !optout)
      throw new BookingError("Early access registration is paused.", 409);
    if (join && old?.status === "active") return old; // Duplicate joins cannot change preferences or restore consent.
    if ((old?.revision ?? 0) !== i.revision)
      throw new BookingError(
        "Your registration changed. Refresh before saving.",
        409,
      );
    await tx.query(
      "INSERT INTO reserve_vitalis_interests(user_id,status,interests,region,outreach,notice_version) VALUES($1,'active',$2::jsonb,$3,$4,$5) ON CONFLICT(user_id) DO UPDATE SET status='active',interests=$2::jsonb,region=$3,outreach=$4,notice_version=$5,revision=reserve_vitalis_interests.revision+1,updated_at=now()",
      [a.id, JSON.stringify(i.interests), i.region, i.outreach, noticeVersion],
    );
    if (!old || old.status === "withdrawn") {
      await consent(tx, a.id, "collection", "grant");
      await event(tx, "join_completed");
    }
    if (i.outreach !== Boolean(old?.outreach))
      await consent(
        tx,
        a.id,
        "launch-email",
        i.outreach ? "grant" : "withdraw",
      );
    return readInterest(tx, a);
  });
}
export async function withdraw(db: Database, a: Actor, revision: number) {
  requireVitalisMember(a);
  return db.transaction(async (tx) => {
    await tx.query("SELECT id FROM reserve_users WHERE id=$1 FOR UPDATE", [
      a.id,
    ]);
    const old = await readInterest(tx, a);
    if (!old) return null;
    if (old.status === "withdrawn") return old;
    if (old.revision !== revision)
      throw new BookingError(
        "Your registration changed. Refresh before withdrawing.",
        409,
      );
    await tx.query(
      "UPDATE reserve_vitalis_interests SET status='withdrawn',interests='[]',region='',outreach=false,revision=revision+1,updated_at=now() WHERE user_id=$1",
      [a.id],
    );
    await consent(tx, a.id, "collection", "withdraw");
    if (old.outreach) await consent(tx, a.id, "launch-email", "withdraw");
    await event(tx, "withdraw_completed");
    return readInterest(tx, a);
  });
}
export async function saveSettings(db: Queryable, a: Actor, input: unknown) {
  requireVitalisOwner(a);
  const i = settingsInput.parse(input);
  const [r] = await db.query(
    "UPDATE reserve_vitalis_settings SET visible=$1,registration_open=$2,revision=revision+1,updated_at=now() WHERE id='vitalis' AND revision=$3 RETURNING revision",
    [i.visible, i.registration_open, i.revision],
  );
  if (!r)
    throw new BookingError("Release settings changed. Refresh first.", 409);
}
export async function savePartner(db: Queryable, a: Actor, input: unknown) {
  requireVitalisOwner(a);
  const i = partnerInput.parse(input);
  const params = [
    i.id,
    i.name,
    JSON.stringify(i.categories),
    JSON.stringify(i.regions),
    i.status,
    i.kind,
    i.destination,
    i.destinationReviewed,
    a.id,
  ];
  const sql =
    i.revision === 0
      ? "INSERT INTO reserve_vitalis_partners(id,name,categories,regions,status,kind,destination,destination_reviewed,updated_by,reviewed_at) VALUES($1,$2,$3::jsonb,$4::jsonb,$5,$6,$7,$8,$9,now()) ON CONFLICT(id) DO NOTHING RETURNING id"
      : "UPDATE reserve_vitalis_partners SET name=$2,categories=$3::jsonb,regions=$4::jsonb,status=$5,kind=$6,destination=$7,destination_reviewed=$8,updated_by=$9,reviewed_at=now(),updated_at=now(),revision=revision+1 WHERE id=$1 AND revision=$10 RETURNING id";
  const [r] = await db.query(
    sql,
    i.revision === 0 ? params : [...params, i.revision],
  );
  if (!r) throw new BookingError("Partner draft changed. Refresh first.", 409);
}
export async function overview(db: Queryable, a: Actor, page = 0) {
  requireVitalisOwner(a);
  const [
    settings,
    totals,
    interests,
    regions,
    weekly,
    roster,
    partners,
    funnel,
  ] = await Promise.all([
    readSettings(db),
    db.query(
      "SELECT count(*)::int AS active,count(*) FILTER(WHERE outreach)::int AS contact_ready FROM reserve_vitalis_interests WHERE status='active'",
    ),
    db.query(
      "SELECT value AS category,count(*)::int AS count FROM reserve_vitalis_interests,jsonb_array_elements_text(interests) WHERE status='active' GROUP BY value",
    ),
    db.query(
      "SELECT region,count(*)::int AS count FROM reserve_vitalis_interests WHERE status='active' AND region<>'' GROUP BY region ORDER BY count(*) DESC",
    ),
    db.query(
      "SELECT date_trunc('week',created_at)::date AS week,count(*)::int AS count FROM reserve_vitalis_consent_events WHERE purpose='collection' AND decision='grant' AND created_at>now()-interval '12 weeks' GROUP BY 1 ORDER BY 1 DESC",
    ),
    db.query(
      "SELECT u.name,u.email,i.interests,i.region,i.outreach,i.created_at FROM reserve_vitalis_interests i JOIN reserve_users u ON u.id=i.user_id WHERE i.status='active' ORDER BY i.created_at DESC LIMIT 26 OFFSET $1",
      [page * 25],
    ),
    db.query<Partner & Record<string, unknown>>(
      'SELECT id,name,categories,regions,status,kind,destination,destination_reviewed AS "destinationReviewed",revision,reviewed_at FROM reserve_vitalis_partners ORDER BY updated_at DESC LIMIT 100',
    ),
    db.query(
      "SELECT event,sum(count)::int AS count FROM reserve_vitalis_funnel WHERE day>CURRENT_DATE-30 GROUP BY event",
    ),
  ]);
  return {
    settings,
    totals: totals[0],
    interests,
    regions,
    weekly,
    roster: roster.slice(0, 25),
    hasMore: roster.length > 25,
    page,
    partners,
    funnel,
  };
}

export async function cleanup(db: Database, a: Actor) {
  requireVitalisOwner(a);
  return db.transaction(async (tx) => {
    const removed = await tx.query(
      "DELETE FROM reserve_vitalis_interests WHERE updated_at<now()-interval '12 months' RETURNING user_id",
    );
    await tx.query(
      "DELETE FROM reserve_vitalis_consent_events WHERE created_at<now()-interval '12 months' AND NOT EXISTS(SELECT 1 FROM reserve_vitalis_interests i WHERE i.user_id=reserve_vitalis_consent_events.user_id AND i.status='active')",
    );
    return removed.length;
  });
}
