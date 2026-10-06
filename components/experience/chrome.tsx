'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { brand } from '@/lib/brand';
import { locationDisplayName, primaryLocation } from '@/lib/experience/locations';
import { MotionMode } from './motion-mode';

export function ExperienceChrome({children, footer}: {children: React.ReactNode; footer: React.ReactNode}) {
  const path = usePathname();
  const arrival = path === '/';
  const work = path.startsWith('/studio');
  if (work) return <>{children}</>;
  return <>
    {arrival && <MotionMode />}
    {!arrival && <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="experience-header">
        <Link prefetch={false} href="/enter" className="experience-brand">
          <Image src={brand.mark} alt="" width={48} height={48} />
          <span>{brand.wordmark}<small>{locationDisplayName(primaryLocation.id).toUpperCase()}</small></span>
        </Link>
        <nav aria-label="Legacy Reserve navigation">
          <Link href="/home">Home</Link>
          <Link href="/book">Book</Link>
          <Link prefetch={false} href="/my-visit">My visits</Link>
        </nav>
        <details className="experience-menu" onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.currentTarget.open = false;
            event.currentTarget.querySelector<HTMLElement>("summary")?.focus();
          }
        }} onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) event.currentTarget.open = false;
        }}>
          <summary>Menu</summary>
          <nav aria-label="More destinations">
            <MotionMode />
            <Link href="/fix-it-shop">Fix It Shop</Link>
            <Link href="/gent-ascend">Gent Ascend Collective</Link>
            <Link prefetch={false} href="/my-visit">Your visit</Link>
            <Link prefetch={false} href="/account">Manage appointments</Link>
            <Link href="/chair">The Chair</Link>
            <Link prefetch={false} href="/profile">Your profile</Link>
            <Link href="/setup?help=1">Install help</Link>
            <Link prefetch={false} href="/signin">Account sign-in</Link>
            <Link href="/?replay=1">Replay arrival</Link>
          </nav>
        </details>
      </header>
    </>}
    {children}
    {!arrival && !work && path !== '/home' && path !== '/book' && path !== '/my-visit' && path !== '/chair' && path !== '/sanctum-mirror' && path !== '/mirror' && footer}
  </>;
}
