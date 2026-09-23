"use client";

import { useEffect, useState } from "react";

const chapters = [
  { id: "the-place", label: "The place" },
  { id: "compass", label: "Your way in" },
  { id: "the-people", label: "The people" },
  { id: "worlds", label: "The two worlds" },
  { id: "beyond", label: "Beyond the visit" },
  { id: "eunice", label: "Eunice" },
  { id: "begin", label: "Begin" },
] as const;

/** Observe only the homepage story. The content and links work before hydration. */
export function ReserveScrollDirector() {
  const [active, setActive] = useState<string>("the-place");
  const [pastArrival, setPastArrival] = useState(false);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".reserve-story");
    if (!root || !window.IntersectionObserver) return;

    const reveals = [...root.querySelectorAll<HTMLElement>("[data-reveal]")];
    const sceneObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        (entry.target as HTMLElement).classList.add("is-revealed");
        sceneObserver.unobserve(entry.target);
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

    // Initial visibility is established before the enhancement class can hide anything.
    for (const target of reveals) {
      if (target.getBoundingClientRect().top < window.innerHeight * .94) target.classList.add("is-revealed");
      else sceneObserver.observe(target);
    }
    root.classList.add("has-cinematic-motion");

    const chapterObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
    }, { rootMargin: "-18% 0px -64% 0px" });
    for (const { id } of chapters) {
      const target = document.getElementById(id);
      if (target) chapterObserver.observe(target);
    }
    const arrival = root.querySelector(".arrival");
    const arrivalObserver = new IntersectionObserver(([entry]) => setPastArrival(!entry.isIntersecting), { threshold: 0 });
    if (arrival) arrivalObserver.observe(arrival);

    return () => {
      root.classList.remove("has-cinematic-motion");
      sceneObserver.disconnect();
      chapterObserver.disconnect();
      arrivalObserver.disconnect();
    };
  }, []);

  return (
    <nav className={`story-rail${pastArrival ? " story-rail--present" : ""}`} aria-label="Reserve story chapters">
      <span className="story-rail__track" aria-hidden="true" />
      {chapters.map(({ id, label }, index) => (
        <a key={id} href={`#${id}`} aria-label={`${index + 1}. ${label}`} aria-current={active === id ? "location" : undefined}>
          <span className="story-rail__dot" aria-hidden="true" />
          <span className="story-rail__label">{label}</span>
        </a>
      ))}
    </nav>
  );
}
