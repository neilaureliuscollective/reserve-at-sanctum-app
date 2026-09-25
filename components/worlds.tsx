import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { LivingEmblem } from "@/components/living-emblem";
export function Worlds() {
  return (
    <section id="worlds" className="section worlds" data-scene>
      <div className="section-heading" data-reveal>
        <div>
          <p className="eyebrow">04 / THE TWO WORLDS</p>
          <h2>
            Two worlds.
            <br />
            <em>One shared purpose.</em>
          </h2>
        </div>
        <p>
          Independent businesses. Their first shared address.
          <br />
          Discover what each brings to the Reserve.
        </p>
      </div>
      <div className="world-grid">
        <Link href="/fix-it-shop" className="world-card blue" data-reveal>
          <Image
            src="/images/reserve-craft.webp"
            alt="Concept of a salon professional giving a considered cut"
            fill
            sizes="(max-width: 700px) 100vw, 50vw"
          />
          <div className="world-overlay" />
          <div className="world-emblem"><LivingEmblem brand="fix" ambient={false} /></div>
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
        <Link href="/gent-ascend" className="world-card gent" data-reveal>
          <Image src="/images/reserve-ritual.webp" alt="Concept of a personal grooming ritual" fill sizes="(max-width: 700px) 100vw, 50vw" />
          <div className="world-overlay" />
          <div className="world-emblem world-emblem--gent"><LivingEmblem brand="gent" ambient={false} /></div>
          <div className="world-top">
            <span>02 / THE COLLECTIVE</span>
            <span>Official emblem</span>
          </div>
          <div className="world-copy">
            <span className="eyebrow">GROOMING. RITUAL. ASCENSION.</span>
            <h3>GENT Ascend</h3>
            <p>
              Grooming, products, performance, and wellness
              <br />
              carried beyond this location.
            </p>
            <span className="world-enter">
              Enter GENT Ascend <ArrowUpRight size={22} />
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
}
