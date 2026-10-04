'use client';
import Link from 'next/link';
export default function Error({reset}:{reset:()=>void}) {return <main id="main" className="visit-world"><p className="experience-kicker">YOUR RESERVE · EUNICE</p><h1>Your visit couldn’t refresh.</h1><p>No appointment has been changed.</p><button className="button button-gold" onClick={reset}>Try again</button><Link prefetch={false} href="/account" className="text-link">Manage your visits</Link></main>;}
