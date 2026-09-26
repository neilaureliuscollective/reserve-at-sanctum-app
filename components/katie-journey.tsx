"use client";

import { ArrowUpRight, Pause, Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ramp = (p: number, start: number, end: number) => clamp((p - start) / (end - start));

export function KatieDirector() {
  const [mode, setMode] = useState<"pending" | "motion" | "still">("pending");
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setReduced(query.matches);
      if (query.matches) setMode("still");
      else setMode(localStorage.getItem("katie-journey-still") === "true" ? "still" : "motion");
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (mode === "pending") return;
    const stage = document.querySelector<HTMLElement>(".katie-film");
    if (!stage) return;
    const chapters = [...stage.querySelectorAll<HTMLElement>(".katie-film__chapter")];
    stage.dataset.motion = String(mode === "motion");
    if (mode === "still") {
      chapters.forEach(chapter => { chapter.inert = false; chapter.removeAttribute("aria-hidden"); });
      stage.style.removeProperty("--beat-1");
      stage.style.removeProperty("--beat-2");
      stage.style.removeProperty("--beat-3");
      return;
    }
    let frame = 0;
    let active = -1;
    const update = () => {
      frame = 0;
      const box = stage.getBoundingClientRect();
      const p = clamp(-box.top / Math.max(1, box.height - window.innerHeight));
      const values = [1 - ramp(p, .16, .35), Math.min(ramp(p, .17, .37), 1 - ramp(p, .52, .71)), ramp(p, .54, .76)];
      values.forEach((value, index) => stage.style.setProperty("--beat-" + (index + 1), value.toFixed(4)));
      const next = p < .29 ? 0 : p < .64 ? 1 : 2;
      if (next !== active) {
        active = next;
        chapters.forEach((chapter, index) => { chapter.inert = index !== active; chapter.setAttribute("aria-hidden", String(index !== active)); });
        stage.dataset.active = String(active + 1);
      }
    };
    const request = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    return () => { window.removeEventListener("scroll", request); window.removeEventListener("resize", request); if (frame) cancelAnimationFrame(frame); };
  }, [mode]);

  const toggle = () => {
    if (reduced) return;
    const next = mode === "motion" ? "still" : "motion";
    localStorage.setItem("katie-journey-still", String(next === "still"));
    setMode(next);
  };
  return <nav className="katie-nav" aria-label="Explore Katie’s world"><div><a href="#experience">The experience</a><a href="#the-chair">Your chair</a><a href="#visit">Plan a visit</a></div><button type="button" onClick={toggle} disabled={mode === "pending" || reduced} aria-pressed={mode === "still"} aria-label={mode === "motion" ? "Show the still view" : "Enable cinematic motion"}>{mode === "motion" ? <Pause size={13} /> : <Play size={13} />}<span>{mode === "motion" ? "STILL VIEW" : "MOTION OFF"}</span></button></nav>;
}

const preferences = {
  quiet: { label: "Quiet time", text: "Time to settle in without having to fill the silence." },
  talk: { label: "Let's talk", text: "A familiar conversation while Katie takes care of the details." },
  flexible: { label: "See how it goes", text: "A little conversation, a little quiet. The day can decide." },
} as const;

export function KatiePreferencePreview() {
  const [choice, setChoice] = useState<keyof typeof preferences>("flexible");
  return <div className="katie-choice"><span className="katie-kicker">A PREVIEW OF THE CHAIR</span><p className="katie-choice__question">How would you like the time to feel?</p><div className="katie-choice__options" role="group" aria-label="Preview your visit preference">{(Object.keys(preferences) as Array<keyof typeof preferences>).map(key => <button key={key} type="button" aria-pressed={choice === key} onClick={() => setChoice(key)}>{preferences[key].label}</button>)}</div><div className="katie-choice__response" aria-live="polite"><span>YOUR PACE / {preferences[choice].label.toUpperCase()}</span><p>{preferences[choice].text}</p></div><small>This is a preview. Open The Chair to save and share your preferences with Katie.</small><Link href="/chair" className="katie-link">Open The Chair <ArrowUpRight size={17} /></Link></div>;
}
