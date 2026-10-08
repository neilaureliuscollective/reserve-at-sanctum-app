import { DateTime } from "luxon";
import type { Actor } from "../booking";
import { BookingError } from "../booking-error";
import type { Database, Queryable } from "../db";
import { requireMember, readRoutine } from "../personal-reserve";
import {
  journeyInput,
  checkInput,
  clearInput,
  journeyNotice,
  type Journey,
} from "./journey-design";
export function journeyCalendar(now = Date.now()) {
  const local = DateTime.fromMillis(now, { zone: "America/Chicago" }).startOf(
    "day",
  );
  if (!local.isValid) throw Error("Invalid clock");
  const monday = local.minus({ days: local.weekday - 1 });
  return {
    today: local.toISODate()!,
    week: Array.from({ length: 7 }, (_, i) =>
      monday.plus({ days: i }).toISODate()!,
    ),
    cutoff: local.minus({ days: 89 }).toISODate()!,
  };
}
export async function readJourney(db: Queryable, a: Actor, now = Date.now()) {
  requireMember(a);
  const [row] = await db.query<Journey & Record<string, unknown>>(
    "SELECT active,direction,minutes,target,days,revision,started_on::text FROM reserve_vitalis_journeys WHERE user_id=$1",
    [a.id],
  );
  const { today, week, cutoff } = journeyCalendar(now);
  return {
    journey: row
      ? { ...row, days: row.days.filter((d) => d >= cutoff && d <= today) }
      : null,
    today,
    week,
  };
}
export async function journeyOverview(
  db: Queryable,
  a: Actor,
  now = Date.now(),
) {
  requireMember(a);
  const [view, routine] = await Promise.all([
    readJourney(db, a, now),
    readRoutine(db, a),
  ]);
  // Reuse the canonical routine as a separate connection; never replace it.
  return {
    ...view,
    routine:
      routine && !routine.cleared
        ? { title: routine.title, priority: routine.priority }
        : null,
  };
}
const conflict = () =>
  new BookingError(
    "Your rhythm changed. Reload your saved rhythm before trying again.",
    409,
  );
export async function saveJourney(
  db: Database,
  a: Actor,
  input: unknown,
  now = Date.now(),
) {
  requireMember(a);
  const i = journeyInput.parse(input),
    calendar = journeyCalendar(now);
  return db.transaction(async (tx) => {
    await tx.query("SELECT id FROM reserve_users WHERE id=$1 FOR UPDATE", [
      a.id,
    ]);
    const old = (await readJourney(tx, a, now)).journey;
    if ((old?.revision ?? 0) !== i.revision) throw conflict();
    const days = old?.active && old.direction === i.direction ? old.days : [];
    await tx.query(
      `INSERT INTO reserve_vitalis_journeys(user_id,active,direction,minutes,target,days,started_on,notice_version,consented_at)
      VALUES($1,true,$2,$3,$4,$5::jsonb,$6::date,$7,now()) ON CONFLICT(user_id) DO UPDATE SET active=true,direction=$2,minutes=$3,target=$4,days=$5::jsonb,started_on=$6::date,notice_version=$7,consented_at=now(),revision=reserve_vitalis_journeys.revision+1,updated_at=now()`,
      [
        a.id,
        i.direction,
        i.minutes,
        i.target,
        JSON.stringify(days),
        old?.active && old.direction === i.direction
          ? old.started_on
          : calendar.today,
        journeyNotice,
      ],
    );
    return readJourney(tx, a, now);
  });
}
export async function checkJourney(
  db: Database,
  a: Actor,
  input: unknown,
  now = Date.now(),
) {
  requireMember(a);
  const i = checkInput.parse(input),
    { today } = journeyCalendar(now);
  return db.transaction(async (tx) => {
    await tx.query("SELECT id FROM reserve_users WHERE id=$1 FOR UPDATE", [
      a.id,
    ]);
    const old = (await readJourney(tx, a, now)).journey;
    if (!old?.active)
      throw new BookingError("Save a rhythm before marking a day.", 409);
    if (old.revision !== i.revision) throw conflict();
    const days = old.days.filter((d) => d !== today);
    if (i.completed) days.push(today);
    days.sort();
    await tx.query(
      "UPDATE reserve_vitalis_journeys SET days=$2::jsonb,revision=revision+1,updated_at=now() WHERE user_id=$1",
      [a.id, JSON.stringify(days)],
    );
    return readJourney(tx, a, now);
  });
}
export async function clearJourney(
  db: Database,
  a: Actor,
  input: unknown,
  now = Date.now(),
) {
  requireMember(a);
  const i = clearInput.parse(input);
  return db.transaction(async (tx) => {
    await tx.query("SELECT id FROM reserve_users WHERE id=$1 FOR UPDATE", [
      a.id,
    ]);
    const old = (await readJourney(tx, a, now)).journey;
    if (!old || old.revision !== i.revision) throw conflict();
    await tx.query(
      "UPDATE reserve_vitalis_journeys SET active=false,direction=NULL,minutes=NULL,target=NULL,days='[]',started_on=NULL,notice_version='',consented_at=NULL,revision=revision+1,updated_at=now() WHERE user_id=$1",
      [a.id],
    );
    return readJourney(tx, a, now);
  });
}
