"use client";

import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const chapters = [
  { name: "Settle in", title: "The time is yours.", body: "Bring a direction, a question, or a fresh start. The visit begins with what matters to you.", image: "/images/katie/private-chair.webp", alt: "Illustrative men’s salon setting, not the finished Fix It Shop location" },
  { name: "The details", title: "Care, up close.", body: "Shape and texture. The small decisions that help a look feel personal. This is where attention becomes craft.", image: "/images/katie/craft-close.webp", alt: "Illustrative salon technique, not Katie or a photograph of her work" },
  { name: "Your next chapter", title: "Take it into your day.", body: "A finish that fits the person wearing it. Your time in the chair becomes part of what comes next.", image: "/images/katie/departure.webp", alt: "Illustrative salon departure, not a photograph of a Fix It Shop client" },
];

export function FixItVisitFilm() {
  const stage = useRef<HTMLDivElement>(null);
  const [motion, setMotion] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => { setReduced(query.matches); setMotion(!query.matches); };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    const node = stage.current;
    if (!motion || !node) return;
    let frame = 0;
    const chapters = [...node.querySelectorAll<HTMLElement>(".fis-film__chapter")];
    const update = () => {
      frame = 0;
      const box = node.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -box.top / Math.max(1, box.height - window.innerHeight + 78)));
      const position = progress * 2;
      const next = Math.min(2, Math.floor(position + .5));
      setActive(previous => previous === next ? previous : next);
      node.style.setProperty("--fis-travel", String(progress));
      chapters.forEach((chapter, index) => {
        const distance = position - index;
        chapter.style.setProperty("--fis-distance", String(distance));
        chapter.style.setProperty("--fis-visibility", String(Math.max(0, 1 - Math.abs(distance))));
      });
    };
    const request = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    return () => { window.removeEventListener("scroll", request); window.removeEventListener("resize", request); if (frame) cancelAnimationFrame(frame); };
  }, [motion]);
  return <section className="fis-journey" aria-labelledby="fis-film-title">
    <header className="fis-wrap fis-film__heading"><div><p className="fis-kicker">02 / INSIDE THE EXPERIENCE</p><h2 id="fis-film-title">From the first moment.<br /><em>To what comes next.</em></h2></div><button className="fis-motion" type="button" disabled={reduced} aria-pressed={!motion} onClick={() => setMotion(value => !value)}>{motion ? <Pause size={14} /> : <Play size={14} />}{motion ? "Still view" : "Motion off"}</button></header>
    <div ref={stage} className="fis-film" data-motion={motion}>
      <div className="fis-film__frame">{chapters.map((chapter, index) => <article className="fis-film__chapter" key={chapter.name} aria-hidden={motion ? index !== active : undefined}>
        <div className="fis-film__environment"><Image src={chapter.image} alt={chapter.alt} fill sizes="100vw" /></div><div className="fis-film__veil" />
        <div className="fis-film__copy"><p className="fis-kicker">0{index + 1} / {chapter.name.toUpperCase()}</p><h3>{chapter.title}</h3><p>{chapter.body}</p></div>
      </article>)}
      {motion && <div className="fis-film__progress" aria-hidden="true">{chapters.map((chapter, index) => <span key={chapter.name} data-active={index === active}><i />{chapter.name}</span>)}</div>}
      <small className="fis-film__caption">ILLUSTRATIVE PROCESS IMAGERY · NOT KATIE, HER CLIENTS OR THE FINISHED SPACE</small>
      </div>
    </div>
  </section>;
}

const moods = [
  { id: "quiet", label: "Quiet time", title: "A moment to yourself.", copy: "Room to settle in, without having to fill the silence." },
  { id: "conversation", label: "Let’s talk", title: "Make room for conversation.", copy: "A little connection while the details get their attention." },
  { id: "balance", label: "See how it goes", title: "Let the day decide.", copy: "Some conversation. Some quiet. Your pace can change." },
];

export function FixItAtmosphere() {
  const [choice, setChoice] = useState(0);
  const mood = moods[choice];
  return <div className="fis-atmosphere" data-mood={mood.id}>
    <div className="fis-atmosphere__light" aria-hidden="true"><div /><div /><div /></div>
    <p className="fis-kicker">A PREVIEW OF YOUR PACE</p>
    <div className="fis-atmosphere__options" role="group" aria-label="Preview your visit atmosphere">{moods.map((item, index) => <button type="button" key={item.id} aria-pressed={choice === index} onClick={() => setChoice(index)}>{item.label}</button>)}</div>
    <div className="fis-atmosphere__response" aria-live="polite"><span>0{choice + 1} / {mood.label.toUpperCase()}</span><h3>{mood.title}</h3><p>{mood.copy}</p></div>
    <small>Preview only. Open The Chair to save and share a preference.</small>
  </div>;
}
