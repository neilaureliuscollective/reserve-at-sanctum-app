import Image from 'next/image';
import Link from 'next/link';
import { safeDestination } from '@/lib/experience/entry';

/** Render no private data and never redirect merely because a session expires. */
export function AccountEntrance({ next }: { next: string }) {
  return <main id="main" className="reserve-account-entrance">
    <Image src="/images/approved/fix-it-shop.webp" alt="Fix It Shop crest" width={96} height={96} priority />
    <p className="experience-kicker">YOUR FIX IT SHOP ACCOUNT</p>
    <h1>Your visits.<br /><em>When you’re ready.</em></h1>
    <p>Sign in to see your private visits and saved preferences. You can keep exploring without an account.</p>
    <div className="room-actions">
      <Link prefetch={false} className="button button-gold" href={`/signin?next=${encodeURIComponent(safeDestination(next))}`}>Sign in to continue ↗</Link>
      <Link className="button button-outline" href="/fix-it-shop/app">Keep exploring</Link>
    </div>
  </main>;
}
