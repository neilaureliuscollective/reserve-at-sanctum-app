'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
export function Threshold() {
  const router = useRouter();
  const [entering, setEntering] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function remember() { try { document.cookie = `reserve-arrival-v1=seen; Path=/; Max-Age=15552000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`; } catch {} }
  function enter(event: React.MouseEvent<HTMLAnchorElement>) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    remember();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    event.preventDefault();
    if (entering) return;
    setEntering(true);
    router.prefetch('/home');
    timer.current = setTimeout(() => router.push('/home'), 950);
  }
  return <main id="main" className={`reserve-threshold ${entering ? 'is-entering' : ''}`}>
    <div className="threshold-room" aria-hidden="true"><Image src="/images/cinematic/reserve-hall.webp" alt="" fill sizes="100vw" priority /></div>
    <div className="threshold-wing threshold-wing-left" aria-hidden="true" /><div className="threshold-wing threshold-wing-right" aria-hidden="true" />
    <div className="threshold-content"><p className="experience-kicker">EUNICE, LOUISIANA</p><Image src="/images/cinematic/reserve-seal.webp" width={136} height={136} alt="The Reserve crest" priority /><p className="experience-kicker">THE RESERVE AT SANCTUM</p><h1>A place to arrive.<br /><em>A standard to return to.</em></h1><p>Men’s hair, personal grooming, and the care between visits.</p><div className="threshold-actions"><Link href="/home" onClick={enter} className="button button-gold">Enter the Reserve</Link><Link href="/book" className="threshold-book">Book a visit ↗</Link></div><div className="threshold-quiet"><Link href="/home" onClick={remember}>Enter immediately</Link><Link href="/signin">Sign in</Link></div><small>CONCEPT ENVIRONMENT · PRIVATE PILOT</small><span role="status" className="sr-only">{entering ? 'Opening the Reserve…' : ''}</span></div>
  </main>;
}
