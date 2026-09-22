import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
export function Worlds() {
  return (
    <section id="worlds" className="section worlds">
      <div className="section-heading">
        <div>
          <p className="eyebrow">02 / THE TWO WORLDS</p>
          <h2>
            Two worlds.
            <br />
            <em>One shared purpose.</em>
          </h2>
        </div>
        <p>
          Distinct identities. A shared address.
          <br />
          Discover what each brings to the Reserve.
        </p>
      </div>
      <div className="world-grid">
        <Link href="/fix-it-shop" className="world-card blue">
          <Image
            src="/images/fix-it.webp"
            alt="Concept of Fix It Shop's warm navy-and-gold salon environment"
            fill
            sizes="(max-width: 700px) 100vw, 50vw"
          />
          <div className="world-overlay" />
          <div className="world-top">
            <span>01 / THE CRAFT</span>
            <span>Concept imagery</span>
          </div>
          <div className="world-copy">
            <span className="eyebrow">CRAFT. CARE. CONFIDENCE.</span>
            <h3>Fix It Shop</h3>
            <p>
              Personal attention. A considered cut.
              <br />A place in Katie’s chair.
            </p>
            <span className="world-enter">
              Explore Fix It Shop <ArrowUpRight size={22} />
            </span>
          </div>
        </Link>
        <Link href="/aurelius" className="world-card purple">
          <Image
            src="/images/aurelius.webp"
            alt="Concept of Aurelius Collective: bronze Atlas sculpture and daily ritual objects"
            fill
            sizes="(max-width: 700px) 100vw, 50vw"
          />
          <div className="world-overlay" />
          <div className="world-top">
            <span>02 / THE COLLECTIVE</span>
            <span>Concept imagery</span>
          </div>
          <div className="world-copy">
            <span className="eyebrow">CHARACTER. DISCIPLINE. LEGACY.</span>
            <h3>Aurelius Collective</h3>
            <p>
              A wider vision for wellbeing and growth.
              <br />
              The person you become.
            </p>
            <span className="world-enter">
              Explore Aurelius Collective <ArrowUpRight size={22} />
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
}
