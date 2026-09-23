"use client";

import Link from "next/link";
import { ArrowUpRight, Compass, MoveUpRight, Sparkles } from "lucide-react";
import { useState } from "react";

type Direction = "craft" | "ritual" | "place";

const directions = {
  craft: {
    number: "01", label: "The craft", prompt: "I want to feel sharper.",
    heading: "Start with the person in the chair.",
    detail: "Katie brings the care and attention behind a considered cut. Begin with her world, then see how that care can carry forward.",
    primary: { href: "/fix-it-shop", label: "Meet Katie’s Fix It Shop" },
    secondary: { href: "/gent-ascend", label: "See what Neil brings next" },
  },
  ritual: {
    number: "02", label: "The ritual", prompt: "I want a better rhythm.",
    heading: "Carry the care beyond the visit.",
    detail: "Neil’s world starts with grooming direction and practical rituals you can make your own. Katie’s chair is there when it is time for the craft.",
    primary: { href: "/gent-ascend", label: "Explore GENT Ascend" },
    secondary: { href: "/fix-it-shop", label: "Meet Katie’s craft" },
  },
  place: {
    number: "03", label: "The place", prompt: "I want to see what this is.",
    heading: "Get to know the Reserve.",
    detail: "Two independent businesses are building a shared place in Eunice. See the vision, meet the people, and find the door that feels right.",
    primary: { href: "/visit", label: "Discover the place" },
    secondary: { href: "#the-people", label: "Meet Katie and Neil" },
  },
} as const;

export function ReserveCompass() {
  const [choice, setChoice] = useState<Direction | null>(null);
  const selected = choice ? directions[choice] : null;

  return (
    <section id="compass" className="reserve-compass" data-scene data-signal={choice ?? "rest"} aria-labelledby="compass-title">
      <div className="compass-atmosphere" aria-hidden="true" />
      <div className="compass-heading" data-reveal>
        <div className="story-meta"><span>02 / THE RESERVE COMPASS</span><span>THREE WAYS IN · ONE SHARED PLACE</span></div>
        <p className="eyebrow">FIND YOUR FIRST STEP</p>
        <h2 id="compass-title">Your way in<br /><em>starts here.</em></h2>
        <p>There is no one way to begin. Choose what brought you here and watch the Reserve open around it.</p>
      </div>

      <div className="compass-layout">
        <div className="compass-choices" role="group" aria-label="Choose what brings you to the Reserve" data-reveal>
          {(Object.keys(directions) as Direction[]).map((key) => {
            const direction = directions[key];
            return (
              <button key={key} type="button" className="compass-choice" aria-pressed={choice === key} onClick={() => setChoice(key)}>
                <span className="compass-choice__number">{direction.number}</span>
                <span className="compass-choice__copy"><span>{direction.label}</span><strong>{direction.prompt}</strong></span>
                <MoveUpRight size={21} aria-hidden="true" />
              </button>
            );
          })}
          <p className="compass-privacy">No scan. No account. Just a starting point you choose.</p>
        </div>

        <div className="compass-instrument" aria-hidden="true" data-reveal>
          <div className="compass-instrument__halo" />
          <div className="compass-instrument__floor" />
          <div className="compass-instrument__ring compass-instrument__ring--outer" />
          <div className="compass-instrument__ring compass-instrument__ring--middle" />
          <div className="compass-instrument__ring compass-instrument__ring--inner" />
          <div className="compass-instrument__axis compass-instrument__axis--one" />
          <div className="compass-instrument__axis compass-instrument__axis--two" />
          <div className="compass-instrument__heart"><Compass size={45} strokeWidth={.75} /><span>R</span></div>
          <span className="compass-instrument__point compass-instrument__point--craft">CRAFT</span>
          <span className="compass-instrument__point compass-instrument__point--ritual">RITUAL</span>
          <span className="compass-instrument__point compass-instrument__point--place">PLACE</span>
        </div>
      </div>

      <div className="compass-result" aria-live="polite" data-reveal>
        {selected ? (
          <div key={choice} className="compass-result__selected">
            <span className="compass-result__marker"><Sparkles size={16} aria-hidden="true" /> YOUR FIRST STEP · {selected.label.toUpperCase()}</span>
            <h3>{selected.heading}</h3>
            <p>{selected.detail}</p>
            <div className="compass-result__actions">
              <Link className="button button-gold" href={selected.primary.href}>{selected.primary.label} <ArrowUpRight size={17} /></Link>
              <Link className="text-link" href={selected.secondary.href}>{selected.secondary.label} <ArrowUpRight size={16} /></Link>
            </div>
          </div>
        ) : (
          <div className="compass-result__idle"><span>YOUR FIRST STEP</span><p>Choose a direction above. The path will take shape here.</p></div>
        )}
      </div>
    </section>
  );
}
