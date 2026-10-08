import Link from "next/link";
import { AetheliosPreview } from "@/components/digital-reserve";
export const metadata = { title: "Meet Aethelios", description: "Aethelios connects your personal direction with the next useful action inside your digital Legacy Reserve." };
export default function Page() {
  return <main id="main" className="digital-reserve digital-aethelios digital-section"><header className="digital-section-heading"><span className="aethelios-signal" aria-hidden="true"/><p className="digital-label">AETHELIOS / YOUR DIGITAL CONCIERGE</p><h1>A clearer direction.<br /><em>A considered next step.</em></h1><p>Your customer concierge connects personal routines, verified membership benefits and Reserve tools. Explore a few examples before opening your private account experience.</p></header><AetheliosPreview /><div className="digital-actions"><Link href="/aethelios" className="button button-gold">Open your private concierge ↗</Link><Link href="/discover#pathways" className="text-link">Explore your digital worlds ↗</Link></div></main>;
}
