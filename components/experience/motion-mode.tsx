'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/** A single preference for the environment. It stores no identity or client data. */
export function MotionMode() {
  const path = usePathname();
  const [still, setStill] = useState(false);
  const [reduced, setReduced] = useState(false);
  const preference = useRef(false);

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let saved = false;
    try { saved = localStorage.getItem('reserve-motion-v1') === 'still'; } catch {}
    preference.current = saved;
    setStill(saved);
    const apply = () => {
      setReduced(media.matches);
      document.documentElement.dataset.reserveStill = String(preference.current || media.matches);
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  function toggle() {
    if (reduced) return;
    const next = !still;
    preference.current = next;
    setStill(next);
    document.documentElement.dataset.reserveStill = String(next);
    try { localStorage.setItem('reserve-motion-v1', next ? 'still' : 'motion'); } catch {}
  }

  if (path !== '/' && path !== '/home' && path !== '/discover' && !path.startsWith('/founder')) return null;
  return <button type="button" className="experience-motion" onClick={toggle}
    aria-pressed={still || reduced} disabled={reduced}
    aria-label={reduced ? 'Still environment: system reduced motion is enabled' : still ? 'Enable environment motion' : 'Pause environment motion'}>
    {still || reduced ? 'Still' : 'Motion'}<span aria-hidden="true"> · </span><span>Sound off</span>
  </button>;
}
