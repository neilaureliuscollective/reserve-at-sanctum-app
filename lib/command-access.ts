import { BookingError, type Actor } from './booking';
import type { Queryable } from './db';

/** Reload permission state inside transactions and after provider work. */
export async function verifiedOperator(db: Queryable, actor: Actor) {
  const [current] = await db.query<Actor>('SELECT * FROM reserve_users WHERE id=$1', [actor.id]);
  if (!current || (current.role !== 'owner' && !(current.role === 'staff' && current.provider_id)))
    throw new BookingError('Reserve operator access is required.', 403);
  return current;
}
export function requireOperator(actor: Actor) {
  if (actor.role !== 'owner' && !(actor.role === 'staff' && actor.provider_id))
    throw new BookingError('Reserve operator access is required.', 403);
}
export function workPredicate(actor: Actor, sharedOnly = false, alias = 'w') {
  requireOperator(actor);
  return sharedOnly ? `${alias}.visibility='shared'` : actor.role === 'owner' ? 'TRUE'
    : `(${alias}.visibility='shared' OR (${alias}.visibility='provider' AND ${alias}.provider_id=$1))`;
}
export const workParams = (actor: Actor, sharedOnly = false) => actor.role === 'owner' || sharedOnly ? [] : [actor.provider_id];
