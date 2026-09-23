"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useRef, useState } from "react";

type Direction = "craft" | "ritual" | "place";

const directions = {
  craft: {
    name: "Katie’s craft", prompt: "Feel sharper", eyebrow: "01 / FIX IT SHOP",
    heading: "The care begins in the chair.",
    detail: "A considered cut, personal attention, and a place where you are known.",
    image: "/images/reserve-craft.webp",
    primary: { href: "/fix-it-shop", label: "Enter Katie’s world" },
    secondary: { href: "/gent-ascend", label: "See Neil’s rituals" },
  },
  ritual: {
    name: "Neil’s ritual", prompt: "Find a rhythm", eyebrow: "02 / GENT ASCEND",
    heading: "Take the care with you.",
    detail: "Grooming direction and small rituals that carry beyond the visit.",
    image: "/images/reserve-ritual.webp",
    primary: { href: "/gent-ascend", label: "Enter Neil’s world" },
    secondary: { href: "/fix-it-shop", label: "Meet Katie’s craft" },
  },
  place: {
    name: "The Reserve", prompt: "Find my place", eyebrow: "03 / EUNICE, LOUISIANA",
    heading: "There is room for you here.",
    detail: "Two independent worlds are giving their shared belief a home in Eunice.",
    image: "/images/reserve-threshold.webp",
    primary: { href: "/visit", label: "Discover the Reserve" },
    secondary: { href: "#the-people", label: "Meet the people" },
  },
} as const;

const keys: Direction[] = ["craft", "ritual", "place"];

export function ReserveCompass() {
  const [choice, setChoice] = useState<Direction | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const selected = choice ? directions[choice] : null;

  function choose(key: Direction, event: React.MouseEvent<HTMLButtonElement>) {
    setChoice(key);
    if (event.detail > 0) {
      requestAnimationFrame(() => {
        const bounds = stage.current?.getBoundingClientRect();
        if (bounds && bounds.top > window.innerHeight * .35) {
          stage.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" });
        }
      });
    }
  }

  return (
    <section id="compass" className="reserve-compass reserve-portal" data-scene data-signal={choice ?? "rest"} aria-labelledby="compass-title">
      <div className="story-meta"><span>02 / YOUR WAY IN</span><span>THREE PATHS · ONE SHARED RESERVE</span></div>
      <div className="portal-heading"><p className="eyebrow">THE RESERVE THRESHOLD</p><h2 id="compass-title">Choose a door.<br /><em>See where it leads.</em></h2><p>The place comes to life around the direction you choose.</p></div>

      <div className="portal-choices" role="group" aria-label="Choose your way into the Reserve">
        {keys.map((key, index) => (
          <button key={key} type="button" className="portal-choice" aria-pressed={choice === key} onClick={(event) => choose(key, event)}>
            <span className="portal-choice__number">0{index + 1}</span>
            <span className="portal-choice__name">{directions[key].name}</span>
            <span className="portal-choice__prompt">{directions[key].prompt}</span>
            <ArrowUpRight aria-hidden="true" size={18} />
          </button>
        ))}
      </div>

      <div ref={stage} className="portal-stage" data-reveal>
        <div className="portal-stage__scene portal-stage__scene--rest" aria-hidden="true"><Image src="/images/reserve-threshold.webp" alt="" fill sizes="(max-width: 760px) 100vw, 90vw" /></div>
        {keys.map((key) => (
          <div key={key} className={`portal-stage__scene portal-stage__scene--${key}`} aria-hidden="true"><Image src={directions[key].image} alt="" fill sizes="(max-width: 760px) 100vw, 90vw" /></div>
        ))}
        <span className="portal-stage__arch portal-stage__arch--rear" aria-hidden="true" />
        <span className="portal-stage__arch portal-stage__arch--front" aria-hidden="true" />
        <span className="portal-stage__beam" aria-hidden="true" />
        <div className="portal-stage__content" aria-live="polite" aria-atomic="true">
          {selected ? (
            <div key={choice} className="portal-stage__reveal">
              <span className="portal-stage__eyebrow">{selected.eyebrow} · CONCEPT IMAGERY</span>
              <h3>{selected.heading}</h3>
              <p>{selected.detail}</p>
              <div className="portal-stage__actions"><Link href={selected.primary.href} className="button button-gold">{selected.primary.label} <ArrowUpRight size={17} /></Link><Link href={selected.secondary.href} className="text-link">{selected.secondary.label} <ArrowUpRight size={16} /></Link></div>
            </div>
          ) : (
            <div className="portal-stage__reveal"><span className="portal-stage__eyebrow">THE RESERVE · EUNICE, LOUISIANA · CONCEPT IMAGERY</span><h3>There is more<br />through the door.</h3><p>Choose what brings you here. The scene will change with you.</p></div>
          )}
        </div>
        <span className="portal-stage__progress" aria-hidden="true"><span /></span>
      </div>
      <noscript><p className="compass-fallback">Explore directly: <Link href="/fix-it-shop">Katie’s craft</Link> · <Link href="/gent-ascend">Neil’s rituals</Link> · <Link href="/visit">the Reserve</Link>.</p></noscript>
    </section>
  );
}
