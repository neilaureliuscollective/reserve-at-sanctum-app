import Link from "next/link";
import { vitalisMembershipDesign } from "@/lib/vitalis/membership-design";
import "../../vitalis.css";
import "../../vitalis-revenue.css";
export const metadata = {
  title: "Vitalis membership · In preparation",
  description:
    "Explore the proposed Vitalis membership direction. Paid enrollment is not open.",
};
export default function Page() {
  return (
    <main id="main" className="vitalis-environment vitalis-membership">
      <p>
        <Link href="/vitalis/journey" className="button button-outline">
          Try the free wellness pilot ↗
        </Link>
      </p>
      <section className="vitalis-horizon">
        <p className="experience-kicker">
          LEGACY RESERVE VITALIS · MEMBERSHIP VISION
        </p>
        <h1>
          A lasting relationship.
          <br />A more vital life.
        </h1>
        <p>
          Three proposed levels of belonging, built around continuity, useful
          guidance and qualified care.
        </p>
        <p className="vitalis-note">
          In preparation. These are target prices and planned benefits, not an
          offer to purchase. No paid enrollment, medical services or product
          discounts are active.
        </p>
      </section>
      <section
        className="vitalis-plan-grid"
        aria-label="Proposed membership comparison"
      >
        {vitalisMembershipDesign.map((p) => (
          <article key={p.name} className="vitalis-plan">
            <p className="experience-kicker">
              PROPOSED · VITALIS {p.name.toUpperCase()}
            </p>
            <h2>{p.name}</h2>
            <p className="vitalis-plan-price">
              ${p.price}
              <span>/month target</span>
            </p>
            <p>{p.position}</p>
            <ul>
              {p.benefits.map((b) => (
                <li key={b}>
                  {b} <small>· Planned</small>
                </li>
              ))}
              <li>
                {p.discount}% off eligible products{" "}
                <small>· Planned, margin-qualified items only</small>
              </li>
            </ul>
            <p className="vitalis-note">{p.exclusions}</p>
            <Link
              href="/vitalis#early-access"
              className="button button-outline"
            >
              Explore free early access ↗
              <span className="sr-only"> for {p.name}</span>
            </Link>
          </article>
        ))}
      </section>
      <section className="vitalis-horizon">
        <p className="experience-kicker">CLEAR FROM THE BEGINNING</p>
        <h2>Your account. One connected environment.</h2>
        <p>
          Early access is free. It does not select a paid plan, create a
          subscription or establish treatment eligibility. Future partner care
          will have its own clinical consent and eligibility process for adults,
          with availability confirmed by the provider.
        </p>
        <p>
          Today you can keep a personal routine in Pathways and your grooming
          preferences in your existing profile. Advanced health dashboards,
          clinical connections and concierge access are still planned.
        </p>
        <div className="member-actions">
          <Link href="/pathways" className="button button-gold">
            Explore Pathways ↗
          </Link>
          <Link href="/membership" className="text-link">
            Your existing membership ↗
          </Link>
          <Link href="/vitalis" className="text-link">
            Return to Vitalis ↗
          </Link>
        </div>
      </section>
    </main>
  );
}
