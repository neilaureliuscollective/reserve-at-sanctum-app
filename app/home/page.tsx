import { ReserveRooms } from '@/components/experience/reserve-rooms';
import { HomeRefresh } from '@/components/experience/home-refresh';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { database } from '@/lib/db';
import { eunice } from '@/lib/experience/locations';
import { DateTime } from 'luxon';
export const dynamic = 'force-dynamic';
export default async function Home({searchParams}: {searchParams: Promise<{explore?: string}>}) {
  const actor = await currentUser();
  const exploring = (await searchParams).explore === '1';
  if (actor && actor.role !== 'client' && !exploring) redirect('/studio');
  let visit: { starts_at: string | Date; service_name: string; provider_name: string } | undefined;
  let failed = false;
  if (actor?.role === 'client' && !exploring) {
    try { [visit] = await (await database()).query<{ starts_at: string | Date; service_name: string; provider_name: string }>(`SELECT a.starts_at,s.name AS service_name,p.name AS provider_name FROM reserve_appointments a JOIN reserve_services s ON s.id=a.service_id JOIN reserve_providers p ON p.id=a.provider_id WHERE a.client_id=$1 AND a.status='confirmed' AND a.starts_at>now() ORDER BY a.starts_at ASC LIMIT 1`, [actor.id]); } catch { failed = true; }
  }
  const personal = actor?.role === 'client' && !exploring;
  return <main id="main" className="reserve-room"><HomeRefresh /><div className="room-backdrop" aria-hidden="true"><Image src={eunice.poster} alt="" fill sizes="100vw" priority /></div><section className="room-intro"><p className="experience-kicker">THE RESERVE · {eunice.name.toUpperCase()}</p><h1 tabIndex={-1}>{personal ? `Welcome back, ${actor.name.split(' ')[0]}.` : 'Welcome to the Reserve.'}</h1><p className="room-line">{personal ? 'Your next visit. Your own pace.' : 'Come in. Find your people. Leave sharper.'}</p>{personal ? <div className="visit-ledger"><span className="experience-kicker">YOUR NEXT VISIT</span>{failed ? <><p>Unable to refresh your visits.</p><Link href="/home" className="text-link">Try again</Link></> : visit ? <><h2>{visit.service_name}</h2><p>{DateTime.fromJSDate(new Date(visit.starts_at)).setZone(eunice.timezone).toFormat('cccc, LLLL d · h:mm a')} · {visit.provider_name}</p><div className="room-actions"><Link href="/my-visit" className="button button-gold">Open your visit</Link><Link href="/account" className="text-link">Manage your visit ↗</Link></div></> : <><p>No upcoming visit is booked.</p><Link href="/book" className="button button-gold">Book a visit</Link></>}</div> : <Link href="/book" className="button button-gold">Book a visit ↗</Link>}<small className="room-concept">CONCEPT ENVIRONMENT · NOT THE FINISHED EUNICE LOCATION</small></section><ReserveRooms /><div className="room-secondary"><Link href="/my-visit">Your visit & ongoing care ↗</Link><Link href="/my-sanctum">Your grooming Blueprint ↗</Link><Link href="/visit">About Eunice ↗</Link><Link href="/explore">Explore the Reserve ↗</Link></div></main>;
}
