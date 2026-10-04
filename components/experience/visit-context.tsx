import Link from 'next/link';
import { DateTime } from 'luxon';
import { currentUser } from '@/lib/auth';
import { database } from '@/lib/db';
import { readVisitContinuity } from '@/lib/experience/visits';

export async function VisitContext({ providerId, compact = false }: { providerId?: string; compact?: boolean }) {
  const actor = await currentUser();
  if (!actor || actor.role !== 'client') return null;
  try {
    const { next } = await readVisitContinuity(await database(), actor);
    if (!next || (providerId && next.provider_id !== providerId)) return null;
    const time = DateTime.fromJSDate(new Date(next.starts_at)).setZone('America/Chicago').toFormat('LLL d · h:mm a');
    return <aside className={`visit-context ${compact ? 'visit-context--compact' : ''}`} aria-label="Your upcoming visit">
      <span>YOUR NEXT VISIT</span><p>{next.service_name} · {next.provider_name}<small>{time} CT · Eunice</small></p>
      <Link href={`/my-visit?visit=${encodeURIComponent(next.id)}`}>Open your visit ↗</Link>
    </aside>;
  } catch {
    return <aside className="visit-context" role="status"><p>Your visit details couldn’t refresh.</p><Link href="/my-visit">Open your visits ↗</Link></aside>;
  }
}
