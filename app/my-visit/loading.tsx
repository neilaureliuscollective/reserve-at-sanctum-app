import Link from 'next/link';
export default function Loading() {return <main id="main" className="visit-world"><p className="experience-kicker">YOUR RESERVE · EUNICE</p><h1>Opening your visit…</h1><p role="status">Refreshing your appointment.</p><Link prefetch={false} href="/account" className="text-link">Your visits ↗</Link></main>;}
