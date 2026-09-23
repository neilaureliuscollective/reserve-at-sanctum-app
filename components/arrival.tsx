import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { LivingEmblem } from "@/components/living-emblem";

export function Arrival() {
  return (
    <section
      className="arrival"
      aria-labelledby="arrival-title"
    >
      <div className="arrival-image">
        <Image
          src="/images/reserve-grooming-concept.webp"
          alt="Concept scene of a grooming ritual at a table in warm Louisiana light"
          fill
          loading="eager"
          fetchPriority="high"
          sizes="100vw"
        />
      </div>
      <div className="arrival-shade" />
      <div className="arrival-location" aria-hidden="true">THE ARRIVAL <span>01</span></div>
      <div className="arrival-content">
        <p className="eyebrow">
          <span className="line" /> A MEN’S SANCTUARY · EUNICE, LOUISIANA
        </p>
        <h1 id="arrival-title">
          Small-town roots.
          <br />
          <em>A bigger standard.</em>
        </h1>
        <p className="arrival-description">
          Grooming that goes deeper.
          <br />
          With room to become more, together.
        </p>
        <div className="hero-actions">
          <a className="button button-gold" href="#begin">
            Find your way in <ArrowUpRight size={18} />
          </a>
          <Link className="text-link" href="/book">
            Explore visits <ArrowUpRight size={16} />
          </Link>
        </div>
        <p className="partnership">
          FIX IT SHOP <span>×</span> GENT ASCEND COLLECTIVE
        </p>
      </div>
      <div className="reserve-emblem-stage"><LivingEmblem brand="reserve" priority controls /></div>
      <div className="arrival-bottom">
        <a href="#the-place" className="scroll-cue">
          <ArrowDown size={15} /> STEP INSIDE
        </a>

      </div>
    </section>
  );
}
