import Link from 'next/link';
export default function NotFound() {return <main id="main" className="visit-world"><p className="experience-kicker">YOUR RESERVE</p><h1>This visit isn’t available.</h1><p>Open your own appointment list to find the right visit.</p><Link prefetch={false} href="/account" className="button button-gold">Your visits</Link></main>;}
