'use client';
import Link from 'next/link';
export default function Error({reset}: {reset:()=>void}) {return <main id="main" className="reserve-room"><p className="experience-kicker">THE RESERVE · EUNICE</p><h1>Your Reserve couldn’t refresh.</h1><p>Your account and visits haven’t been changed.</p><button onClick={reset} className="button button-gold">Try again</button><Link href="/signin?next=/home" className="text-link">Sign in again</Link><Link href="/home?explore=1" className="text-link">Explore the Reserve</Link></main>;}
