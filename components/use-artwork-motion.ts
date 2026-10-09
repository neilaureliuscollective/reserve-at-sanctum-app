"use client";
import { useEffect, useRef, useState } from "react";

/** Artwork stays visible; animation runs only while visible and permitted. */
export function useArtworkMotion(quiet = false) {
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState("poster");
  const [still, setStill] = useState(true);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const node = host.current;
    if (!node || quiet) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const sync = () => {
      const paused = media.matches || document.documentElement.dataset.reserveStill === "true";
      setStill(paused);
      setState(visible && !document.hidden && !paused ? "active" : "paused");
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }, { threshold: 0.1 });
    observer.observe(node);
    const mutation = new MutationObserver(sync);
    mutation.observe(document.documentElement, { attributes: true, attributeFilter: ["data-reserve-still"] });
    media.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    setReady(true);
    sync();
    return () => {
      observer.disconnect();
      mutation.disconnect();
      media.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [quiet]);
  function toggle() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const next = !still;
    document.documentElement.dataset.reserveStill = String(next);
    try { localStorage.setItem("reserve-motion-v1", next ? "still" : "motion"); } catch {}
  }
  return { host, state, still, ready, toggle };
}
