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

    // A single passive scroll director drives scene depth on touch as well as desktop.
    // Only visible scenes receive writes; native scrolling remains in full control.
    const scenes = [...root.querySelectorAll<HTMLElement>("[data-scene]")];
    let frame = 0;
    function updateScenes() {
      frame = 0;
      const height = window.innerHeight;
      for (const scene of scenes) {
        const bounds = scene.getBoundingClientRect();
        if (bounds.bottom < -height * .2 || bounds.top > height * 1.2) continue;
        const progress = Math.min(1, Math.max(0, (height - bounds.top) / (height + bounds.height)));
        scene.style.setProperty("--scene-progress", progress.toFixed(3));
        scene.style.setProperty("--scene-shift", `${((progress - .5) * 72).toFixed(1)}px`);
        scene.style.setProperty("--scene-turn", `${((progress - .5) * 7).toFixed(2)}deg`);
      }
    }
    function requestSceneFrame() { if (!frame) frame = requestAnimationFrame(updateScenes); }
    updateScenes();
    window.addEventListener("scroll", requestSceneFrame, { passive: true });
    window.addEventListener("resize", requestSceneFrame);

    return () => {
      root.classList.remove("has-cinematic-motion");
      window.removeEventListener("scroll", requestSceneFrame);
      window.removeEventListener("resize", requestSceneFrame);
      if (frame) cancelAnimationFrame(frame);
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
