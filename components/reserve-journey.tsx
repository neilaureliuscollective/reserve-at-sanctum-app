"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";

type Path = "craft" | "ritual" | "reserve";
const paths = {
  craft: { label: "Katie’s craft", overline: "THE BLUE ROOM", heading: "A visit built around you.", text: "Meet Katie and the care behind the cut.", image: "/images/reserve-craft.webp", href: "/fix-it-shop", action: "Enter Fix It Shop" },
  ritual: { label: "Neil’s ritual", overline: "THE GREEN ROOM", heading: "Care that carries forward.", text: "Grooming direction, considered products and the wider Gent Ascend world.", image: "/images/reserve-ritual.webp", href: "/gent-ascend", action: "Enter Gent Ascend" },
  reserve: { label: "The Reserve", overline: "THE SHARED PLACE", heading: "Come see what is taking shape.", text: "Two independent worlds meet in Eunice, Louisiana.", image: "/images/cinematic/reserve-hall.webp", href: "/visit", action: "Discover the Reserve" },
} as const;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ramp = (value: number, start: number, end: number) => clamp((value - start) / (end - start));
const hold = (value: number, start: number, peak: number, fall: number, end: number) => Math.min(ramp(value, start, peak), 1 - ramp(value, fall, end));

export function JourneyDirector() {
  const [still, setStill] = useState(false);
  useEffect(() => {
    const saved = window.localStorage.getItem("reserve-journey-still");
    setStill(saved === "true" || window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".reserve-cinema-v2");
    if (!root) return;
    const stages = [...root.querySelectorAll<HTMLElement>("[data-film-stage]")];
    root.classList.toggle("cinema-ready", !still);
    if (still) { stages.forEach(stage => { stage.removeAttribute("style"); stage.querySelectorAll<HTMLElement>(".film-encounter__story").forEach(story => { story.inert = false; story.removeAttribute("aria-hidden"); }); }); return; }
    let frame = 0;
    function update() {
      frame = 0;
      for (const stage of stages) {
        const rect = stage.getBoundingClientRect();
        if (rect.bottom < -innerHeight || rect.top > innerHeight * 2) continue;
        const p = clamp(-rect.top / Math.max(1, rect.height - innerHeight));
        stage.style.setProperty("--p", p.toFixed(4));
        if (stage.dataset.filmStage === "threshold") {
          stage.style.setProperty("--door", ramp(p, .12, .84).toFixed(4));
          stage.style.setProperty("--hall", ramp(p, .43, .83).toFixed(4));
          stage.style.setProperty("--threshold-copy", (1 - ramp(p, .18, .49)).toFixed(4));
        } else if (stage.dataset.filmStage === "encounter") {
          const craft = hold(p, .08, .23, .38, .50);
          const ritual = hold(p, .48, .60, .78, .91);
          stage.style.setProperty("--craft", craft.toFixed(4));
          stage.style.setProperty("--ritual", ritual.toFixed(4));
          stage.style.setProperty("--encounter-intro", (1 - ramp(p, .08, .22)).toFixed(4));
          const craftStory = stage.querySelector<HTMLElement>(".film-encounter__story--craft");
          const ritualStory = stage.querySelector<HTMLElement>(".film-encounter__story--ritual");
          for (const [story, visible] of [[craftStory, craft > .3], [ritualStory, ritual > .3]] as const) {
            if (!story) continue;
            story.inert = !visible;
            story.setAttribute("aria-hidden", String(!visible));
          }
        } else if (stage.dataset.filmStage === "collection") {
          stage.style.setProperty("--collection-entry", ramp(p, 0, .44).toFixed(4));
        } else if (stage.dataset.filmStage === "home") {
          stage.style.setProperty("--home-light", ramp(p, .04, .75).toFixed(4));
        }
      }
    }
    const request = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    return () => { root.classList.remove("cinema-ready"); window.removeEventListener("scroll", request); window.removeEventListener("resize", request); if (frame) cancelAnimationFrame(frame); };
  }, [still]);
  function toggleStill() { const next = !still; setStill(next); window.localStorage.setItem("reserve-journey-still", String(next)); }
  return <div className="film-navigation"><nav aria-label="Explore the Reserve"><a href="#the-place">Enter</a><a href="#worlds">The people</a><a href="#your-way">Your way</a><a href="#the-collection">The collection</a><a href="#eunice">Eunice</a></nav><button type="button" onClick={toggleStill} aria-pressed={still} aria-label={still ? "Enable cinematic motion" : "Pause cinematic motion"}>{still ? <Play size={14} /> : <Pause size={14} />}<span>{still ? "PLAY FILM" : "STILL VIEW"}</span></button></div>;
}

export function ReserveWay() {
  const [path, setPath] = useState<Path>("reserve");
  const selected = paths[path];
  return <section id="your-way" className="film-way" aria-labelledby="way-title" data-path={path}>
    <div className="film-way__header"><span className="film-index">03 / CHOOSE YOUR WAY</span><h2 id="way-title">Where do you<br /><em>step next?</em></h2><p>One shared place. Three ways to begin.</p></div>
    <div className="film-way__world">
      {(Object.keys(paths) as Path[]).map(key => <div key={key} className="film-way__image" data-active={key === path} aria-hidden="true"><Image src={paths[key].image} alt="" fill sizes="100vw" /></div>)}
      <div className="film-way__aperture" aria-hidden="true" />
      <div className="film-way__controls" role="group" aria-label="Choose your way into the Reserve">{(Object.keys(paths) as Path[]).map((key, index) => <button key={key} type="button" aria-pressed={path === key} onClick={() => setPath(key)}><small>0{index + 1}</small><strong>{paths[key].label}</strong></button>)}</div>
      <div className="film-way__destination" key={path} aria-live="polite"><span>{selected.overline} · CONCEPT ENVIRONMENT</span><h3>{selected.heading}</h3><p>{selected.text}</p><Link href={selected.href} className="film-link">{selected.action} <ArrowUpRight size={18} /></Link></div>
    </div>
  </section>;
}
