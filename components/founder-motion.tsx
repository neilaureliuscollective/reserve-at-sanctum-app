"use client";
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import styles from "./founder-story.module.css";

export function FounderMotion() {
  const control = useRef<HTMLButtonElement>(null);
  const [still, setStill] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync(); media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    const root = control.current?.closest<HTMLElement>("main");
    if (!root) return;
    root.dataset.still = String(still || reduced);
    const items = [...root.querySelectorAll<HTMLElement>("[data-reveal]")];
    if (still || reduced) { items.forEach(el => el.dataset.visible = "true"); return; }
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { (entry.target as HTMLElement).dataset.visible = "true"; observer.unobserve(entry.target); }
    }), { threshold: .12 });
    items.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [still, reduced]);
  return <button ref={control} className={styles.motionControl} aria-pressed={still || reduced} disabled={reduced} onClick={() => setStill(value => !value)}>{still || reduced ? <Play size={13}/> : <Pause size={13}/>} {still || reduced ? "Motion off" : "Still view"}</button>;
}
