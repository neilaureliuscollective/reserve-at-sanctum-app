import { isFixItApp } from "@/lib/app-edition";
import Image from 'next/image';
import Link from 'next/link';
import { safeDestination } from '@/lib/experience/entry';

/** Render no private data and never redirect merely because a session expires. */
export function AccountEntrance({ next }: { next: string }) {
  if (isFixItApp()) return <main id="main" className="reserve-account-entrance"><Image src="/fix-it-shop/app/brand-icons/192" alt="Fix It Shop crest" width={96} height={96} priority /><p className="experience-kicker">FIX IT SHOP · PRIVATE STUDIO</p><h1>Your working day.</h1><p>Sign in with your own account. Studio access requires Katie’s verified staff assignment.</p><div className="room-actions"><Link className="button button-gold" href={`/fix-it-shop/app/signin?next=${encodeURIComponent(safeDestination(next))}`}>Sign in to continue ↗</Link><Link className="button button-outline" href="/fix-it-shop/app">Customer experience</Link></div></main>;
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
