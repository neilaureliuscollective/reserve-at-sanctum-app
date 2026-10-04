'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
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
        router.replace('/home');
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
    router.prefetch('/home');
    timer.current = setTimeout(() => router.push('/home'), 800);
  }
  return <main id="main" className={`reserve-threshold ${entering ? 'is-entering' : ''}`}>
    <a href="#threshold-title" className="skip">Skip to entrance</a>
    <div className="threshold-room" aria-hidden="true"><Image src="/images/cinematic/reserve-hall.webp" alt="" fill sizes="100vw" priority /></div>
    <div className="threshold-wing threshold-wing-left" aria-hidden="true" /><div className="threshold-wing threshold-wing-right" aria-hidden="true" />
    <div className="threshold-content" inert={entering}><p className="experience-kicker">EUNICE, LOUISIANA</p><Image src="/brand/reserve-rs-v1/hero-ceremonial.webp" width={136} height={136} alt="The Reserve crest" priority /><p className="experience-kicker">THE RESERVE AT SANCTUM</p><h1 id="threshold-title" tabIndex={-1}>A place to arrive.<br /><em>A standard to return to.</em></h1><p>Men’s hair, personal grooming, and the care between visits.</p><div className="threshold-actions"><Link href="/home" onClick={enter} className="button button-gold">Enter the Reserve</Link><Link href="/book" className="threshold-book">Book a visit ↗</Link></div><div className="threshold-quiet"><Link href="/home" onClick={remember}>Enter immediately</Link><Link prefetch={false} href="/signin">Sign in</Link></div><small>CONCEPT ENVIRONMENT · PRIVATE PILOT</small></div>
    {entering && <div className="threshold-progress"><p role="status">Opening the Reserve…</p><a href="/home" onClick={() => { if (timer.current) clearTimeout(timer.current); }}>Enter immediately ↗</a></div>}
  </main>;
}
