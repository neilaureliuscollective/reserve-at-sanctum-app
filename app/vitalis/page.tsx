import Link from "next/link";
import Image from "next/image";
import { brand } from "@/lib/brand";
import { EarlyAccessForm } from "@/components/vitalis/early-access-form";
import "../vitalis.css";
import { database } from "@/lib/db";
import { readSettings } from "@/lib/vitalis/store";
import { optionalRead } from "@/lib/experience/optional-read";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Vitalis · Advanced Health Intelligence & Longevity",
  description:
    "The next chapter in health intelligence. Explore Legacy Reserve Vitalis and register for early access.",
};
export default async function Page() {
  let visible = true;
  try {
    visible = (await optionalRead(async () => readSettings(await database())))
      .visible;
  } catch {
    /* Informational content remains available; registration fails closed. */
  }
  if (!visible)
    return (
      <main id="main" className="vitalis-environment">
        <section className="vitalis-horizon">
          <p className="experience-kicker">LEGACY RESERVE VITALIS</p>
          <h1>The next chapter is being prepared.</h1>
          <p>
            The introduction is temporarily paused. Existing members can still
            manage their early-access permission.
          </p>
          <EarlyAccessForm />
          <Link href="/home">Return to your Reserve ↗</Link>
        </section>
      </main>
    );
  return (
    <main id="main" className="vitalis-environment">
      <section className="vitalis-hero">
        <div className="vitalis-intro">
          <p className="experience-kicker">LEGACY RESERVE VITALIS</p>
          <p className="vitalis-status">
            <span /> Coming soon
          </p>
          <h1>
            Precision for
            <br />a longer horizon.
          </h1>
          <p className="vitalis-position">
            Advanced Health Intelligence & Longevity
          </p>
          <p className="vitalis-lede">
            Understand more. Navigate with confidence. A considered connection
            between your health, qualified care and the life you want to build.
          </p>
          <a className="button button-gold" href="#early-access">
            Explore early access ↗
          </a>
          <p>
            <Link href="/vitalis/membership" className="text-link">
              Explore the membership vision ↗
            </Link>
          </p>
        </div>
        <div
          className="vitalis-instrument"
          aria-label="Vitalis division emblem"
        >
          <div className="vitalis-ring">
            <Image
              src={brand.mark}
              width={220}
              height={220}
              alt="Legacy Reserve crest"
              priority
            />
          </div>
          <p>VITALIS</p>
          <span>THE NEXT CHAPTER IN HEALTH INTELLIGENCE</span>
          <div className="vitalis-instrument-foot">
            <span>EDUCATION · AVAILABLE</span>
            <span>CLINICAL ACCESS · PLANNED</span>
          </div>
        </div>
      </section>
      <section className="vitalis-pillars" aria-labelledby="pillars-title">
        <div className="vitalis-section-title">
          <p className="experience-kicker">A CONNECTED VISION</p>
          <h2 id="pillars-title">
            Four pillars.
            <br />
            One considered direction.
          </h2>
          <p>
            Each future service will depend on verified partners, availability
            and qualified clinical oversight.
          </p>
        </div>
        <div className="vitalis-pillar-list">
          {[
            [
              "01",
              "Hormone health",
              "Education and future clinician-guided pathways for testosterone and hormonal wellbeing, including women’s care where partners support it.",
            ],
            [
              "02",
              "Advanced diagnostics",
              "Future access to appropriate laboratory testing and professional review across hormonal, metabolic and cardiovascular health.",
            ],
            [
              "03",
              "Longevity & prevention",
              "Evidence-based education connecting long-term vitality with sleep, everyday habits and preventive care.",
            ],
            [
              "04",
              "Clinical partnerships",
              "A clear route to qualified providers, with transparent availability, responsibilities and pricing before you choose.",
            ],
          ].map(([n, t, d]) => (
            <article key={n}>
              <span>{n}</span>
              <div>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
              <small>PLANNED DIRECTION</small>
            </article>
          ))}
        </div>
      </section>
      <section className="vitalis-horizon">
        <p className="experience-kicker">BUILT TO EVOLVE</p>
        <h2>
          Your health.
          <br />A clearer perspective.
        </h2>
        <p>
          Over time, Vitalis is intended to connect clinical navigation,
          consented biomarker trends and a private health dashboard. Those
          capabilities are planned; no health data is connected today.
        </p>
        <div className="vitalis-availability">
          <div>
            <span>AVAILABLE NOW</span>
            <p>
              Explore the vision.
              <br />
              Register your interest.
              <br />
              Manage your early access.
            </p>
          </div>
          <div>
            <span>FUTURE · PARTNER DEPENDENT</span>
            <p>
              Clinical consultations.
              <br />
              Diagnostics and professional review.
              <br />
              Private longitudinal insights.
            </p>
          </div>
        </div>
      </section>
      <section id="early-access" className="vitalis-access">
        <div>
          <p className="experience-kicker">EARLY ACCESS</p>
          <h2>
            Be part of
            <br />
            what comes next.
          </h2>
          <p>
            A simple registration. A clear purpose. Share only what you choose.
          </p>
          <p className="vitalis-note">
            Vitalis does not currently deliver clinical services. Diagnoses,
            prescriptions and treatment decisions belong to licensed healthcare
            professionals.
          </p>
        </div>
        <EarlyAccessForm />
      </section>
      <section className="vitalis-performance">
        <div>
          <p className="experience-kicker">CONNECTED. DISTINCT.</p>
          <h3>
            Performance builds capacity.
            <br />
            Vitalis brings health into perspective.
          </h3>
          <p>
            Your training and daily routines remain in Performance. Future
            health connections will require your explicit choice.
          </p>
        </div>
        <Link
          className="button button-outline"
          href="/pathways?priority=performance"
        >
          Explore Performance ↗
        </Link>
      </section>
    </main>
  );
}
