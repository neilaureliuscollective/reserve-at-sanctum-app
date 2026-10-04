'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export function HomeRefresh() {
  const router = useRouter();
  useEffect(() => {
    document.querySelector<HTMLElement>('.room-intro h1')?.focus({preventScroll:true});
    let last = Date.now();
    const refresh = () => { if (document.visibilityState === 'visible' && Date.now()-last > 30000) { last=Date.now();router.refresh(); } };
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    return () => {window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[router]);
  return null;
}
