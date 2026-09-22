import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, MapPin } from "lucide-react";
export const metadata = { title: "Visit the Reserve" };
export default function Page() {
  return (
    <main id="main" className="inner-page">
      <section className="section split-section visit-intro">
        <div>
          <p className="eyebrow">EUNICE, LOUISIANA</p>
          <h1>
            Rooted here.
            <br />
            <em>Ready for more.</em>
          </h1>
          <p>
            The Reserve at Sanctum brings Fix It Shop and Aurelius Collective
            together around grooming, wellbeing, and community.
          </p>
          <div className="location-line">
            <MapPin size={20} /> Eunice, Louisiana
          </div>
          <p className="muted">
            We’re preparing the experience. The confirmed address, hours, and
            contact information will appear here before public booking opens.
          </p>
          <Link href="/book" className="button button-gold">
            Explore a preview visit <ArrowUpRight size={18} />
          </Link>
        </div>
        <figure className="visit-image">
          <Image
            src="/images/arrival.webp"
            alt="Sanctuary architecture concept opening to a live oak"
            fill
            loading="eager"
            fetchPriority="high"
            sizes="(max-width:700px) 100vw, 50vw"
          />
          <figcaption>Concept architecture</figcaption>
        </figure>
      </section>
    </main>
  );
}
