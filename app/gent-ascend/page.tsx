import { LivingEmblem } from "@/components/living-emblem";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowUpRight, ScanFace, ShieldCheck, Sparkles } from "lucide-react";

export const metadata = {
  title: "GENT Ascend Collective",
  description: "A living men’s grooming experience—personal consultation, intelligent rituals, products, and an evolving Grooming Blueprint.",
};

export default function Page() {
  return (
    <main id="main" className="gent-world">
      <section className="gent-arrival" aria-labelledby="gent-title">
        <div className="gent-atmosphere" aria-hidden="true"><span /><span /><span /></div>
        <div className="gent-arrival-copy">
          <Link href="/" className="back-link"><ArrowLeft size={15} /> THE RESERVE AT SANCTUM</Link>
          <p className="eyebrow">CHARACTER · DISCIPLINE · ASCENSION</p>
          <h1 id="gent-title">GENT<span>ASCEND</span><small>COLLECTIVE</small></h1>
          <p className="gent-promise">Grooming with <em>direction.</em></p>
          <p>A modern men’s grooming sanctum where personal consultation, intelligent rituals, and the right products become one evolving experience.</p>
          <div className="gent-actions"><Link href="/sanctum-mirror" className="button button-gold">Discover your Grooming Blueprint <ScanFace size={18} /></Link><a href="#experience" className="text-link">Enter the world <ArrowDown size={17} /></a></div>
        </div>
        <div className="gent-emblem"><LivingEmblem brand="gent" priority controls /></div>
        <div className="gent-arrival-foot"><span>THE RESERVE · EUNICE, LOUISIANA</span><span>YOUR GROOMING, UNDERSTOOD</span></div>
      </section>

      <nav className="gent-index" aria-label="Explore GENT Ascend">
        <a href="#experience"><span>01</span> The experience</a><a href="#mirror"><span>02</span> The Sanctum Mirror</a><a href="#ritual"><span>03</span> Your ritual</a>
      </nav>

      <section id="experience" className="gent-origin section">
        <div><p className="eyebrow">A LIVING GROOMING EXPERIENCE</p><h2>Beyond the visit.<br /><em>Built around the man.</em></h2></div>
        <div className="gent-origin-copy"><p className="lead">The best grooming begins before the chair—and continues long after it.</p><p>GENT Ascend connects the way you present yourself with the ritual required to maintain it. Your profile remembers your direction, your real routine, and what works for you.</p><p>This is not a generic style quiz. It is the beginning of a relationship between your goals, your consultation, your products, and every future visit.</p></div>
      </section>

      <section id="mirror" className="gent-mirror-section section">
        <div className="mirror-preview" aria-hidden="true"><div className="mirror-preview-orbit"><ScanFace /><i /><i /><i /></div><span>FRONT</span><span>PROFILE</span><span>RITUAL</span></div>
        <div className="gent-mirror-copy"><p className="eyebrow">INTRODUCING THE SANCTUM MIRROR</p><h2>See the whole picture.<br /><em>Before you arrive.</em></h2><p>A guided facial capture and consultation experience creates your first Grooming Blueprint—hair, beard, skin priorities, maintenance, and the direction you want to take.</p><ul><li><ScanFace /> Guided three-angle capture</li><li><Sparkles /> Personal grooming direction</li><li><ShieldCheck /> Private, account-owned profile</li></ul><Link href="/sanctum-mirror" className="button button-gold">Begin the Sanctum Mirror <ArrowUpRight size={18} /></Link></div>
      </section>

      <section id="ritual" className="gent-ritual section">
        <div className="gent-ritual-heading"><p className="eyebrow">BEFORE · DURING · AFTER</p><h2>One profile.<br /><em>Every chapter.</em></h2></div>
        <div className="gent-ritual-grid">
          <article><span>01</span><h3>Arrive prepared.</h3><p>Build your Blueprint at home. Save inspiration, priorities, and questions before your consultation begins.</p></article>
          <article><span>02</span><h3>Refine it together.</h3><p>Bring the profile into the Reserve. Professional observations and decisions become part of your living record.</p></article>
          <article><span>03</span><h3>Carry it forward.</h3><p>Open My Sanctum for your ritual, products, progress, maintenance rhythm, visits, and future recommendations.</p></article>
        </div>
      </section>

      <section className="gent-invitation"><p className="eyebrow">YOUR NEXT VERSION STARTS HERE</p><h2>Your grooming deserves<br /><em>more than guesswork.</em></h2><Link href="/sanctum-mirror" className="button button-gold">Build your Grooming Blueprint <ArrowUpRight size={18} /></Link><Link href="/my-sanctum" className="text-link">Open My Sanctum <ArrowUpRight size={16} /></Link></section>
    </main>
  );
}
