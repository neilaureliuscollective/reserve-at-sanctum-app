'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export function HomeRefresh({ refreshOnReturn = false }: { refreshOnReturn?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    document.querySelector<HTMLElement>('.room-intro h1')?.focus({preventScroll:true});
    performance.mark('reserve:home-actionable');
    if (performance.getEntriesByName('reserve:threshold-start').length) {
      performance.measure('reserve:threshold-to-home', 'reserve:threshold-start', 'reserve:home-actionable');
      performance.clearMarks('reserve:threshold-start');
    }
    if (!refreshOnReturn) return;
    let last = Date.now();
    const refresh = () => { if (document.visibilityState === 'visible' && Date.now()-last > 30000) { last=Date.now();router.refresh(); } };
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    return () => {window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[router, refreshOnReturn]);
  return null;
}
