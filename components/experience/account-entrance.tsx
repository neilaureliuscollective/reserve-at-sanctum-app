import Image from 'next/image';
import Link from 'next/link';
import { safeDestination } from '@/lib/experience/entry';

/** Render no private data and never redirect merely because a session expires. */
export function AccountEntrance({ next }: { next: string }) {
  return <main id="main" className="reserve-account-entrance">
    <Image src="/brand/legacy-reserve/official-seal.webp" alt="Legacy Reserve official seal" width={96} height={96} priority />
    <p className="experience-kicker">YOUR PLACE AT LEGACY RESERVE</p>
    <h1>Your Reserve.<br /><em>When you’re ready.</em></h1>
    <p>Sign in to see your private visits and saved preferences. You can keep exploring without an account.</p>
    <div className="room-actions">
      <Link prefetch={false} className="button button-gold" href={`/signin?next=${encodeURIComponent(safeDestination(next))}`}>Sign in to continue ↗</Link>
      <Link className="button button-outline" href="/home?explore=1">Keep exploring</Link>
    </div>
  </main>;
}
