'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
export function ExperienceChrome({children, footer}: {children: React.ReactNode; footer: React.ReactNode}) {
  const path = usePathname();
  const arrival = path === '/';
  const work = path.startsWith('/studio');
  return <>{!arrival && <><a className="skip" href="#main">Skip to content</a><header className="experience-header"><Link href="/enter" className="experience-brand"><Image src="/images/cinematic/reserve-seal.webp" alt="" width={42} height={42} /><span>THE RESERVE<small>EUNICE, LOUISIANA</small></span></Link><nav aria-label={work ? 'Workspace' : 'Reserve navigation'}>{work ? <><Link href="/studio#schedule">Schedule</Link><Link href="/studio#availability">Availability</Link><Link href="/home?explore=1">Explore</Link></> : <><Link href="/home">Home</Link><Link href="/book">Book</Link><Link href="/my-visit">My Reserve</Link></>}</nav><details className="experience-menu" onKeyDown={(event) => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector<HTMLElement>("summary")?.focus(); } }} onClick={(event) => { if ((event.target as HTMLElement).closest("a")) event.currentTarget.open = false; }}><summary>Menu</summary><nav aria-label="More destinations"><Link href="/fix-it-shop">Fix It Shop</Link><Link href="/gent-ascend">Gent Ascend Collective</Link><Link href="/my-visit">Your visit</Link><Link href="/account">Manage appointments</Link><Link href="/chair">The Chair</Link><Link href="/my-sanctum">Grooming Blueprint</Link><Link href="/setup?help=1">Install help</Link><Link href="/signin">Account sign-in</Link><Link href="/?replay=1">Replay arrival</Link></nav></details></header></>}{children}{!arrival && !work && path !== '/home' && path !== '/book' && path !== '/my-visit' && path !== '/chair' && path !== '/sanctum-mirror' && footer}</>;
}
