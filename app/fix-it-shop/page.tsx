import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ArrowLeft } from "lucide-react";
export const metadata = {
  title: "Katie · Fix It Shop",
  description:
    "It’s never just a haircut. Katie’s men’s cosmetology at The Reserve in Eunice, Louisiana. Your cut, your headspace, your time.",
};
export default function Page() {
  return (
    <main id="main" className="brand-page fix-world craft-world katie-world">
      <section className="katie-arrival" aria-labelledby="fix-title">
        <figure className="katie-arrival-image">
          <Image
            src="/images/fix-it.webp"
            alt="Concept photograph of a men’s grooming chair, warm light, and arranged tools"
            fill
            sizes="(max-width: 760px) 100vw, 56vw"
            loading="eager"
            fetchPriority="high"
          />
          <figcaption>VISUAL CONCEPT · NOT THE FINISHED LOCATION</figcaption>
        </figure>
        <div className="katie-arrival-copy">
          <Link href="/" className="back-link">
            <ArrowLeft size={16} /> THE RESERVE AT SANCTUM
          </Link>
          <p className="eyebrow">FIX IT SHOP · KATIE · MEN’S COSMETOLOGY</p>
          <h1 id="fix-title">
            It’s never
            <br />
            just a<br />
            <em>haircut.</em>
          </h1>
          <p className="katie-lead">
            Come sit down.
            <br />
            Leave a little more like yourself.
          </p>
          <p className="world-body">
            A cut that feels right. A familiar face. Room to talk—or just take a
            breath. That’s the kind of care Katie brings to the chair.
          </p>
          <div className="world-actions">
            <Link href="/chair" className="button button-gold">
              Enter The Chair <ArrowUpRight size={18} />
            </Link>
            <Link href="/book" className="text-link">
              Find your next visit <ArrowUpRight size={17} />
            </Link>
          </div>
          <p className="katie-location">
            EUNICE, LOUISIANA. REAL PEOPLE. PERSONAL CARE.
          </p>
        </div>
      </section>
      <nav className="world-index" aria-label="Explore Fix It Shop">
        <a href="#katies-care">
          <span>01</span> Katie’s care
        </a>
        <a href="#the-chair">
          <span>02</span> The Chair
        </a>
        <a href="#the-craft">
          <span>03</span> The work
        </a>
        <a href="#the-reserve">
          <span>04</span> One Reserve
        </a>
      </nav>
      <section id="katies-care" className="katie-conversation world-section">
        <div>
          <p className="eyebrow">THE QUESTION BEHIND THE CUT</p>
          <h2>
            “How you
            <br />
            <em>been?”</em>
          </h2>
          <span className="katie-fine-rule" />
        </div>
        <div className="katie-story">
          <p className="katie-story-lead">
            Some days, the answer’s easy.
            <br />
            Some days, you need a minute.
          </p>
          <p>
            Work. Family. Bills. Whatever you’re building. Whatever didn’t go to
            plan. You don’t have to set all of it straight before you sit down.
          </p>
          <p>
            Katie cares about the man wearing the haircut. The way you want to
            look, the day you’re having, and whether you feel like talking at
            all.
          </p>
          <p>
            Talk it out. Keep it light. Sit in quiet. There’s room for all
            three.
          </p>
          <p className="katie-signoff">Good hands. No performance required.</p>
        </div>
      </section>
      <section id="the-chair" className="katie-chair-feature world-section">
        <div className="katie-chair-title">
          <p className="eyebrow">A LITTLE CONTEXT. A MORE PERSONAL VISIT.</p>
          <h2>
            The <em>Chair.</em>
          </h2>
          <p>
            Your cut.
            <br />
            Your headspace.
            <br />
            Your time.
          </p>
        </div>
        <div className="katie-chair-invitation">
          <span className="chair-feature-number" aria-hidden="true">
            01—02 MIN
          </span>
          <h3>
            Get your chair ready
            <br />
            before you get here.
          </h3>
          <p>
            Tell Katie what you want from the cut and the time. A few simple
            choices, with the personal parts entirely up to you.
          </p>
          <ul>
            <li>How you want to look.</li>
            <li>Conversation, quiet, or a little of both.</li>
            <li>Only what you want her to remember.</li>
          </ul>
          <Link href="/chair" className="button button-gold">
            Get my chair ready <ArrowUpRight size={18} />
          </Link>
          <p className="chair-small">
            Try it first. Save to your Reserve account when you’re ready.
          </p>
        </div>
      </section>
      <section id="the-craft" className="craft-chapters world-section">
        <div className="craft-chapters-heading">
          <p className="eyebrow">THE WORK · MEN’S COSMETOLOGY</p>
          <h2>
            The details matter.
            <br />
            <em>So does the man.</em>
          </h2>
          <p className="world-body">
            Your hair has to work beyond the appointment. For your job, your
            routine, and the way you actually live.
          </p>
        </div>
        <div className="craft-notes">
          <article>
            <span>01 / FIND YOUR DIRECTION</span>
            <h3>Tell her what feels right.</h3>
            <p>
              What you like. What you’re ready to change. Bring a photo if it
              helps. You don’t need to know the name of the cut.
            </p>
          </article>
          <article>
            <span>02 / CARE IN THE CRAFT</span>
            <h3>Attention where it counts.</h3>
            <p>
              Shape, texture, and a finish that feels your own. Time to talk
              through the look, with Katie handling the professional details.
            </p>
          </article>
          <article>
            <span>03 / TAKE IT WITH YOU</span>
            <h3>Make it work tomorrow.</h3>
            <p>
              A direction that fits the effort you want to put in. Looking after
              yourself should belong in your everyday life.
            </p>
          </article>
        </div>
      </section>
      <section
        className="katie-over-time world-section"
        aria-labelledby="relationships-title"
      >
        <p className="eyebrow">FAMILIARITY, BUILT OVER TIME</p>
        <h2 id="relationships-title">
          A familiar chair.
          <br />
          <em>Room for what changes.</em>
        </h2>
        <p>
          Your usual cut. A different direction. A big week ahead. With your
          permission, The Chair keeps the useful details so every visit doesn’t
          have to start from zero.
        </p>
        <div className="katie-story-placeholder">
          <span>CLIENT STORIES · COMING WITH PERMISSION</span>
          <p>
            This space is reserved for real stories from Katie’s clients, in
            their own words.
          </p>
        </div>
      </section>
      <section id="the-reserve" className="katie-reserve world-section">
        <div>
          <p className="eyebrow">FIX IT SHOP × GENT ASCEND COLLECTIVE</p>
          <h2>
            Two different doors.
            <br />
            <em>One Reserve.</em>
          </h2>
          <p>
            Katie brings her craft, her attention, and a place to land. Neil
            brings grooming direction, skin and beard care, routines, and the
            drive to keep moving forward.
          </p>
          <p>
            Both care about the same thing: the man you’re becoming. Your
            Reserve account keeps the experiences connected, with you choosing
            what you share.
          </p>
        </div>
        <div className="katie-reserve-links">
          <Link href="/gent-ascend">
            <span>NEIL’S WORLD</span>
            <strong>
              Build on the way
              <br />
              you take care of yourself.
            </strong>
            <span>
              Explore GENT Ascend <ArrowUpRight size={18} />
            </span>
          </Link>
          <Link href="/sanctum-mirror">
            <span>THE SANCTUM MIRROR</span>
            <strong>
              Your grooming.
              <br />A clearer direction.
            </strong>
            <span>
              Create your Blueprint <ArrowUpRight size={18} />
            </span>
          </Link>
        </div>
      </section>
      <section id="your-visit" className="craft-invitation world-section">
        <div>
          <p className="eyebrow">YOUR TIME AT FIX IT SHOP</p>
          <h2>
            Come as you are.
            <br />
            <em>Walk out better.</em>
          </h2>
        </div>
        <div className="craft-invitation-actions">
          <Link href="/chair" className="button button-gold">
            Enter The Chair <ArrowUpRight size={18} />
          </Link>
          <Link href="/book" className="text-link">
            Explore the booking preview <ArrowUpRight size={17} />
          </Link>
          <p>
            The private preview uses illustrative services and prices. Katie’s
            approved menu will be added before booking opens.
          </p>
        </div>
      </section>
      <nav className="world-continuation" aria-label="Continue exploring">
        <span>ANOTHER SIDE OF THE RESERVE</span>
        <Link href="/gent-ascend" className="text-link">
          Discover GENT Ascend <ArrowUpRight size={18} />
        </Link>
      </nav>
    </main>
  );
}
