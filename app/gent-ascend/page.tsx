import { LivingEmblem } from "@/components/living-emblem";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowUpRight, ScanFace, ShieldCheck, Sparkles } from "lucide-react";
import { GENT_ASCEND_URL } from "@/lib/collective-link";

export const metadata = {
  title: "GENT Ascend Collective",
  description: "Meet Neil’s independent Gent Ascend Collective and begin a guided Reserve grooming intake.",
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
          <p>Neil’s independent world carries grooming, products, performance, and wellness beyond the physical visit. The Reserve is where that world meets Katie’s salon craft in Eunice.</p>
          <div className="gent-actions"><a href={GENT_ASCEND_URL} className="button button-gold">Open the Gent Ascend app <ArrowUpRight size={18} /></a><a href="#experience" className="text-link">See the connection <ArrowDown size={17} /></a></div>
        </div>
        <div className="gent-emblem"><LivingEmblem brand="gent" priority controls /></div>
        <div className="gent-arrival-foot"><span>THE RESERVE · EUNICE, LOUISIANA</span><span>YOUR GROOMING, UNDERSTOOD</span></div>
      </section>

      <nav className="gent-index" aria-label="Explore GENT Ascend">
        <a href="#experience"><span>01</span> The experience</a><a href="#mirror"><span>02</span> Prepare for a visit</a><a href="#ritual"><span>03</span> Beyond the Reserve</a>
      </nav>

      <section id="experience" className="gent-origin section">
        <div><p className="eyebrow">NEIL’S INDEPENDENT COMPANY</p><h2>Beyond the visit.<br /><em>Built around the man.</em></h2></div>
        <div className="gent-origin-copy"><p className="lead">A great cut has a place. The care you carry every day has a wider home.</p><p>Katie owns her salon experience at the Reserve. Gent Ascend builds the continuing world around grooming direction, products, daily practices, performance, and wellness.</p><p>Both businesses meet at this first physical location. Each keeps its own identity and relationship with you.</p></div>
      </section>

      <section id="mirror" className="gent-mirror-section section">
        <div className="mirror-preview" aria-hidden="true"><div className="mirror-preview-orbit"><ScanFace /><i /><i /><i /></div><span>FRONT</span><span>PROFILE</span><span>RITUAL</span></div>
        <div className="gent-mirror-copy"><p className="eyebrow">THE SANCTUM MIRROR · AT THE RESERVE</p><h2>Arrive with<br /><em>direction.</em></h2><p>A short guided intake uses your stated hair, beard, skin, and maintenance priorities to create a starting Grooming Blueprint. It does not analyze photographs. You may save it to your Reserve account for a consultation.</p><ul><li><ScanFace /> Your stated grooming priorities</li><li><Sparkles /> A first consultation direction</li><li><ShieldCheck /> Private Reserve profile when you choose to save</li></ul><Link href="/sanctum-mirror" className="button button-gold">Begin your Reserve intake <ArrowUpRight size={18} /></Link></div>
      </section>

      <section id="ritual" className="gent-ritual section">
        <div className="gent-ritual-heading"><p className="eyebrow">BEFORE · DURING · AFTER</p><h2>Distinct worlds.<br /><em>One clear path.</em></h2></div>
        <div className="gent-ritual-grid">
          <article><span>01</span><h3>Prepare for the visit.</h3><p>Book Katie’s service and set your Chair preferences in the Reserve. Neil’s guided intake is available if you want a starting grooming direction.</p></article>
          <article><span>02</span><h3>Meet at the Reserve.</h3><p>Katie’s salon craft and Neil’s broader grooming work share a physical home in Eunice. Their private client information stays within its stated purpose.</p></article>
          <article><span>03</span><h3>Carry it forward.</h3><p>Gent Ascend is Neil’s separate app for the wider personal experience. Opening it does not transfer your Reserve answers or sign you in automatically.</p></article>
        </div>
      </section>

      <section className="gent-invitation"><p className="eyebrow">GENT ASCEND COLLECTIVE</p><h2>The visit is a beginning.<br /><em>The work carries on.</em></h2><a href={GENT_ASCEND_URL} className="button button-gold">Explore Neil’s app <ArrowUpRight size={18} /></a><Link href="/book" className="text-link">Book with Katie at the Reserve <ArrowUpRight size={16} /></Link></section>
    </main>
  );
}
