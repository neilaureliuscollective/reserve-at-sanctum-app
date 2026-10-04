import { currentUser } from "./auth";
import { BookingError } from "./booking";
import { database } from "./db";
export async function authenticated() {
  const actor = await currentUser();
  if (!actor) throw new BookingError("Sign in to continue.", 401);
  return { actor, db: await database() };
}
export async function rateLimit(key: string, max = 30) {
  const db = await database();
  const [row] = await db.query<{ total: number }>(
    `INSERT INTO reserve_rate_limits(key,window_start,total) VALUES($1,now(),1) ON CONFLICT(key) DO UPDATE SET total=CASE WHEN reserve_rate_limits.window_start<now()-interval '1 minute' THEN 1 ELSE reserve_rate_limits.total+1 END,window_start=CASE WHEN reserve_rate_limits.window_start<now()-interval '1 minute' THEN now() ELSE reserve_rate_limits.window_start END RETURNING total`,
    [key],
  );
  if (row.total > max)
    throw new BookingError("Please wait a minute before trying again.", 429);
}
