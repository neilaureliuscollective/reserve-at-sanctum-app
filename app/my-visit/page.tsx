import { AccountEntrance } from "@/components/experience/account-entrance";
import Link from 'next/link';
import Image from 'next/image';
import { DateTime } from 'luxon';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { database } from '@/lib/db';
import { readVisitContinuity, readSavedDirection, visitStage, rebookPath } from '@/lib/experience/visits';
import { HomeRefresh } from '@/components/experience/home-refresh';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your visit · Legacy Reserve' };
export default async function MyVisit({ searchParams }: { searchParams: Promise<{ visit?: string }> }) {
  const params = await searchParams;
  const id = params.visit;
  if (id && (id.length > 80 || !/^[a-zA-Z0-9-]+$/.test(id))) notFound();
  const actor = await currentUser();
  if (!actor) return <AccountEntrance next={id ? `/my-visit?visit=${encodeURIComponent(id)}` : '/my-visit'} />;
  if (actor.role !== 'client') redirect('/studio');
  const db = await database();
  const [continuity, direction] = await Promise.all([readVisitContinuity(db, actor, id), readSavedDirection(db, actor)]);
  if (id && !continuity.selected) notFound();
  const visit = id ? continuity.selected : continuity.next ?? continuity.previous;
  const stage = visit ? visitStage(visit) : 'empty';
  const title = stage === 'before' ? 'Your time is set aside.' : stage === 'during' ? 'Your visit is on the calendar now.' : stage === 'elapsed' || stage === 'completed' ? 'Carry your direction forward.' : stage === 'cancelled' ? 'This visit was cancelled.' : 'Your next visit starts here.';
  const katie = visit?.provider_id === 'katie';
  const nextOther = continuity.next && continuity.next.id !== visit?.id ? continuity.next : null;
  return <main id="main" className="visit-world"><HomeRefresh refreshOnReturn />
    <div className="visit-world__art" aria-hidden="true"><Image src={katie ? '/images/katie/private-chair.webp' : '/images/cinematic/reserve-hall.webp'} alt="" fill sizes="100vw" priority /></div>
    <header className="visit-world__heading room-intro"><p className="experience-kicker">{visit?.location_name ? `LEGACY RESERVE SANCTUM — ${visit.location_name.toUpperCase()}` : 'LEGACY RESERVE · YOUR VISIT'}</p><h1 tabIndex={-1}>{title}</h1><p>{stage === 'elapsed' ? 'This appointment’s scheduled time has passed. Attendance and completion haven’t been verified here.' : stage === 'empty' ? 'Choose a visit when you’re ready. Your preferences can come first.' : 'Your appointment, your preparation, and the care between visits.'}</p></header>
    {visit && <section className="visit-record" aria-labelledby="visit-record-title"><div><span className="experience-kicker">{stage === 'elapsed' ? 'PAST APPOINTMENT' : stage === 'completed' ? 'COMPLETED VISIT' : stage === 'cancelled' ? 'CANCELLED APPOINTMENT' : 'YOUR APPOINTMENT'}</span><h2 id="visit-record-title">{visit.service_name}</h2><p>{DateTime.fromJSDate(new Date(visit.starts_at)).setZone(visit.location_timezone || 'America/Chicago').toFormat('cccc, LLLL d · h:mm a')}</p><p>{visit.provider_name} · {visit.location_name ? `Legacy Reserve Sanctum — ${visit.location_name}` : 'Location not recorded'}</p></div><Link prefetch={false} href="/account" className="text-link">Manage your visits ↗</Link></section>}
    <nav className="visit-steps" aria-label="Your visit and ongoing care">
      <section><span>01 / {stage === 'before' || stage === 'during' ? 'BEFORE YOU ARRIVE' : 'YOUR PREFERENCES'}</span><h2>{katie || !visit ? 'Get your chair ready.' : 'Choose your direction.'}</h2><p>{katie || !visit ? 'Tell Katie what you want from your cut and your time. Personal questions are optional; sharing stays your choice.' : 'Build a starting point from your own grooming priorities.'}</p><Link href={katie || !visit ? '/chair' : '/sanctum-mirror'} className="button button-gold">{katie || !visit ? 'Enter The Chair' : 'Begin the Mirror'} ↗</Link><Link href="/visit" className="text-link">Location information ↗</Link></section>
      <section><span>02 / BETWEEN VISITS</span><h2>Your own direction.</h2>{direction ? <><p>{direction.blueprint.direction}</p><p className="visit-disclosure">Saved from your stated choices. This is a starting point, not professional aftercare or a diagnosis.</p><Link prefetch={false} href="/profile" className="text-link">Open your saved Blueprint ↗</Link></> : <><p>A simple routine begins with what matters to you. Use Neil’s Mirror to shape a first grooming Blueprint.</p><Link href="/sanctum-mirror" className="text-link">Build your Blueprint ↗</Link></>}<Link href="/shop" className="text-link">Legacy Reserve collection preview ↗</Link></section>
      <section><span>03 / WHEN YOU’RE READY</span><h2>Make time again.</h2><p>{visit?.rebook_available ? 'Choose the same currently offered service, then pick a new time. Availability is checked again before booking.' : 'Browse the current menu. Services and availability may have changed.'}</p><Link href={visit ? rebookPath(visit) : '/book'} className="button button-gold">{visit?.rebook_available ? 'Book this service again' : 'Explore visits'} ↗</Link></section>
    </nav>
    {nextOther && <aside className="visit-next"><p>Another visit is already on your calendar: {nextOther.service_name} · {DateTime.fromJSDate(new Date(nextOther.starts_at)).setZone('America/Chicago').toFormat('LLL d · h:mm a')} CT</p><Link prefetch={false} href={`/my-visit?visit=${encodeURIComponent(nextOther.id)}`} className="text-link">Open your upcoming visit ↗</Link></aside>}
    <p className="visit-world__concept">CONCEPT ENVIRONMENT · PRIVATE PILOT · NOT THE FINISHED LOCATION</p>
  </main>;
}
