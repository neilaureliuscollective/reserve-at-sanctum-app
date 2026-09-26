"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";

type Path = "katie" | "neil" | "reserve";
const paths = {
  katie: { name: "Katie’s craft", subtitle: "A considered visit", heading: "Take your place in Katie’s chair.", text: "A cut built around you, with care that remembers the person who came in.", image: "/images/reserve-craft.webp", href: "/fix-it-shop", action: "Enter Fix It Shop" },
  neil: { name: "Neil’s ritual", subtitle: "Care beyond the visit", heading: "Carry the care into your day.", text: "Explore grooming direction, personal rituals, and the wider Gent Ascend world.", image: "/images/reserve-ritual.webp", href: "/gent-ascend", action: "Enter Gent Ascend" },
  reserve: { name: "The Reserve", subtitle: "A place to return to", heading: "See what we are building in Eunice.", text: "A shared home for two independent worlds and the men who find their way here.", image: "/images/reserve-threshold.webp", href: "/visit", action: "Discover the Reserve" },
} as const;

export function JourneyDirector() {
  const [still, setStill] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const saved = window.localStorage.getItem("reserve-journey-still");
    setStill(saved === "true" || media.matches);
  }, []);
  useEffect(() => {
    const main = document.querySelector<HTMLElement>(".reserve-journey");
    if (!main) return;
    main.classList.toggle("journey-is-still", still);
    if (still) return;
    const scenes = [...main.querySelectorAll<HTMLElement>("[data-journey-scene]")];
    let frame = 0;
    function update() {
      frame = 0;
      const height = window.innerHeight;
      for (const scene of scenes) {
        const box = scene.getBoundingClientRect();
        if (box.bottom < 0 || box.top > height) continue;
        const progress = Math.max(0, Math.min(1, (height - box.top) / (height + box.height)));
        scene.style.setProperty("--journey-drift", `${((progress - .5) * 88).toFixed(1)}px`);
      }
    }
    function request() { if (!frame) frame = requestAnimationFrame(update); }
    update();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    return () => {
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      if (frame) cancelAnimationFrame(frame);
      for (const scene of scenes) scene.style.removeProperty("--journey-drift");
    };
  }, [still]);
  function toggleStill() {
    const next = !still;
    setStill(next);
    window.localStorage.setItem("reserve-journey-still", String(next));
  }
  return <div className="journey-controls">
    <nav aria-label="Explore the Reserve"><a href="#the-place">The place</a><a href="#worlds">The people</a><a href="#your-way">Your way</a><a href="#the-collection">The collection</a></nav>
    <button type="button" onClick={toggleStill} aria-pressed={still} aria-label={still ? "Enable scene motion" : "Pause scene motion"}>{still ? <Play size={14} /> : <Pause size={14} />} <span>{still ? "MOTION" : "STILL"}</span></button>
  </div>;
}

export function ReserveWay() {
  const [path, setPath] = useState<Path>("reserve");
  const selected = paths[path];
  return <section id="your-way" className="journey-way journey-scene" data-journey-scene aria-labelledby="way-title">
    <div className="journey-way__intro"><p className="journey-index">03 / YOUR WAY IN <span>ONE RESERVE · THREE ENTRIES</span></p><h2 id="way-title">What brings<br /><em>you here?</em></h2></div>
    <div className="journey-way__stage" data-path={path}>
      {(Object.keys(paths) as Path[]).map(key => <div key={key} className="journey-way__scene" data-active={key === path} aria-hidden="true"><Image src={paths[key].image} alt="" fill sizes="100vw" /></div>)}
      <div className="journey-way__architecture" aria-hidden="true" />
      <div className="journey-way__choices" role="group" aria-label="Choose your way into the Reserve">
        {(Object.keys(paths) as Path[]).map((key, index) => <button key={key} type="button" aria-pressed={path === key} onClick={() => setPath(key)}><span>0{index + 1}</span><strong>{paths[key].name}</strong></button>)}
      </div>
      <div className="journey-way__result" aria-live="polite" aria-atomic="true"><p>{selected.subtitle} · CONCEPT IMAGERY</p><h3>{selected.heading}</h3><span>{selected.text}</span><Link href={selected.href} className="journey-text-link">{selected.action} <ArrowUpRight size={19} /></Link></div>
    </div>
  </section>;
}
