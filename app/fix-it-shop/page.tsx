import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ArrowLeft, ArrowDown } from "lucide-react";

export const metadata = {
  title: "Fix It Shop",
  description: "Katie’s men’s salon world at The Reserve in Eunice. Personal attention, considered grooming, and care for the person in the chair.",
};

export default function Page() {
  return (
    <main id="main" className="brand-page fix-world craft-world">
      <section className="craft-arrival" aria-labelledby="fix-title">
        <div className="craft-arrival-copy">
          <Link href="/" className="back-link"><ArrowLeft size={15} /> THE RESERVE AT SANCTUM</Link>
          <p className="eyebrow">KATIE’S MEN’S SALON · EUNICE, LOUISIANA</p>
          <h1 id="fix-title">Fix It <em>Shop.</em></h1>
          <p className="craft-promise">Good hands.<br />A personal standard.</p>
          <p className="world-body">A little time for yourself. Attention to the details. Care for the person in the chair.</p>
          <div className="world-actions">
            <Link href="/book" className="button button-gold">Find your next visit <ArrowUpRight size={18} /></Link>
            <a href="#katies-care" className="text-link">The care behind the craft <ArrowDown size={17} /></a>
          </div>
          <span className="craft-arrival-foot">FIX IT SHOP × THE RESERVE</span>
        </div>
        <figure className="craft-arrival-image">
          <Image src="/images/fix-it.webp" alt="Concept interior: a salon chair, blue walls, warm lighting and carefully arranged tools" fill loading="eager" fetchPriority="high" sizes="(max-width: 760px) 100vw, 52vw" />
          <figcaption>CONCEPT ENVIRONMENT</figcaption>
        </figure>
      </section>
      <nav className="world-index" aria-label="Explore Fix It Shop">
        <a href="#katies-care"><span>01</span> Katie’s care</a>
        <a href="#the-craft"><span>02</span> In the chair</a>
        <a href="#your-visit"><span>03</span> Your visit</a>
      </nav>
      <section id="katies-care" className="care-editorial">
        <div className="care-nameplate">
          <p className="eyebrow">THE PERSON BEHIND FIX IT SHOP</p>
          <p className="care-name">Katie.</p>
          <span>Her craft. Your confidence.</span>
        </div>
        <div className="care-story">
          <p className="eyebrow">PERSONAL, BY NATURE</p>
          <h2>The person comes<br /><em>before the finish.</em></h2>
          <p>Katie cares deeply about her clients. That care is at the heart of Fix It Shop: a men’s salon with a personal connection to the people it serves.</p>
          <p>Within The Reserve, her craft keeps its own identity. The shared vision begins with something she and Neil both value: looking after people.</p>
          <div className="care-detail"><span>THE CRAFT</span><span>THE CONVERSATION</span><span>THE CARE</span></div>
        </div>
      </section>
      <section id="the-craft" className="craft-chapters world-section">
        <div className="craft-chapters-heading">
          <p className="eyebrow">A PLACE IN KATIE’S CHAIR</p>
          <h2>Your style.<br /><em>Your everyday life.</em></h2>
          <p className="world-body">Good grooming belongs to the person wearing it. Your preferences and your routine give the conversation a place to begin.</p>
        </div>
        <div className="craft-notes">
          <article><span>01 / THE CONVERSATION</span><h3>Start with you.</h3><p>What you like. What you would change. How you wear your hair, and what feels natural to you.</p></article>
          <article><span>02 / THE DETAILS</span><h3>A considered finish.</h3><p>Shape, texture, and the small details that make a look feel your own. This is where personal attention and salon craft meet.</p></article>
          <article><span>03 / THE EVERYDAY</span><h3>Take the confidence with you.</h3><p>The bigger idea is simple: care that matters beyond the mirror, in the way you show up for your own life.</p></article>
        </div>
      </section>
      <section id="your-visit" className="craft-invitation world-section">
        <div><p className="eyebrow">YOUR TIME AT FIX IT SHOP</p><h2>Make a little room<br /><em>for yourself.</em></h2></div>
        <div className="craft-invitation-actions">
          <Link href="/book" className="button button-gold">Explore the booking preview <ArrowUpRight size={18} /></Link>
          <Link href="/account" className="text-link">Manage your preview visits <ArrowUpRight size={17} /></Link>
          <p>The private preview uses illustrative services and prices. Katie’s approved menu will be added before booking opens.</p>
        </div>
      </section>
      <nav className="world-continuation" aria-label="Continue exploring">
        <span>ANOTHER SIDE OF THE RESERVE</span>
        <Link href="/aurelius" className="text-link">Discover Aurelius Collective <ArrowUpRight size={18} /></Link>
      </nav>
    </main>
  );
}
