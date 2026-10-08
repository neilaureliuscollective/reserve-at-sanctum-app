'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { DigitalInstrument } from '@/components/digital-instrument';
export function Threshold() {
  const router = useRouter();
  const [entering, setEntering] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const started = useRef(false);
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const finish = () => {
      if (preference.matches && started.current) {
        if (timer.current) clearTimeout(timer.current);
        router.replace('/discover');
      }
    };
    preference.addEventListener('change', finish);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      preference.removeEventListener('change', finish);
    };
  }, [router]);
  function remember() { try { document.cookie = `reserve-arrival-v1=seen; Path=/; Max-Age=15552000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`; } catch {} }
  function enter(event: React.MouseEvent<HTMLAnchorElement>) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    remember();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.reserveStill === 'true') return;
    event.preventDefault();
    if (started.current) return;
    started.current = true;
    setEntering(true);
    performance.mark('reserve:threshold-start');
    router.prefetch('/discover');
    timer.current = setTimeout(() => router.push('/discover'), 800);
  }
  return <main id="main" className={`reserve-threshold ${entering ? 'is-entering' : ''}`}>
    <a href="#threshold-title" className="skip">Skip to entrance</a>
    <div className="threshold-room" aria-hidden="true"><DigitalInstrument /></div>
    <div className="threshold-wing threshold-wing-left" aria-hidden="true" /><div className="threshold-wing threshold-wing-right" aria-hidden="true" />
    <div className="threshold-content" inert={entering}><p className="experience-kicker">LEGACY RESERVE</p><Image src="/brand/legacy-reserve/official-seal.webp" width={148} height={148} alt="Legacy Reserve official seal" priority /><p className="experience-kicker">PRESENCE. PERFORMANCE. WELLBEING.</p><h1 id="threshold-title" tabIndex={-1}>Your personal digital ecosystem.<br /><em>A standard to return to.</em></h1><p>Presence, performance and wellbeing. A standard that travels with you.</p><div className="threshold-actions"><Link href="/discover" onClick={enter} className="button button-gold">Enter the Reserve</Link><Link href="/discover#pathways" className="threshold-book">Explore your direction ↗</Link></div><div className="threshold-quiet"><Link href="/discover" onClick={remember}>Enter immediately</Link><Link prefetch={false} href="/signin">Sign in</Link></div><small>DIGITAL FIRST · PRIVATE PILOT</small></div>
    {entering && <div className="threshold-progress"><p role="status">Opening Legacy Reserve…</p><a href="/discover" onClick={() => { if (timer.current) clearTimeout(timer.current); }}>Enter immediately ↗</a></div>}
  </main>;
}
