"use client";
import { useEffect, useRef, useState } from "react";
import type { CrestScene } from "./living-crest-scene";

/** Server-rendered poster; visible motion alone loads the isolated renderer. */
export function LivingCrest() {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<CrestScene | null>(null);
  const [still, setStill] = useState(true);
  const [state, setState] = useState("poster");
  const [motionReady, setMotionReady] = useState(false);
  useEffect(() => {
    const node = host.current;
    if (!node) return;
    setMotionReady(true);
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const abort = new AbortController();
    let visible = false,
      loading = false,
      failed = false;
    const isStill = () =>
      media.matches || document.documentElement.dataset.reserveStill === "true";
    const update = async () => {
      if (abort.signal.aborted) return;
      const paused = isStill();
      setStill(paused);
      const active = visible && !document.hidden && !paused;
      scene.current?.setActive(active);
      if (scene.current) {
        setState(active ? "active" : "paused");
        return;
      }
      if (!active || loading || failed) return;
      loading = true;
      setState("loading");
      try {
        const { createCrestScene } = await import("./living-crest-scene");
        if (abort.signal.aborted) return;
        if (isStill() || !visible || document.hidden) {
          loading = false;
          setState("poster");
          return;
        }
        scene.current = await createCrestScene(node, abort.signal, () => {
          failed = true;
          scene.current?.dispose();
          scene.current = null;
          if (!abort.signal.aborted) setState("fallback");
        });
        loading = false;
        if (!abort.signal.aborted) void update();
      } catch {
        loading = false;
        failed = true;
        if (!abort.signal.aborted) setState("fallback");
      }
    };
    const observe = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        void update();
      },
      { threshold: 0.05 },
    );
    observe.observe(node);
    const sync = () => void update();
    const mutation = new MutationObserver(sync);
    mutation.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-reserve-still"],
    });
    media.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    const hero = node.closest(".digital-arrival");
    const move = (event: Event) => {
      const pointer = event as PointerEvent;
      if (pointer.pointerType !== "mouse" || isStill()) return;
      const bounds = hero?.getBoundingClientRect();
      if (bounds)
        scene.current?.setPointer(
          (pointer.clientX - bounds.left) / bounds.width - 0.5,
          (pointer.clientY - bounds.top) / bounds.height - 0.5,
        );
    };
    const rest = () => scene.current?.setPointer(0, 0);
    hero?.addEventListener("pointermove", move, { passive: true });
    hero?.addEventListener("pointerleave", rest);
    void update();
    return () => {
      abort.abort();
      observe.disconnect();
      mutation.disconnect();
      media.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      hero?.removeEventListener("pointermove", move);
      hero?.removeEventListener("pointerleave", rest);
      scene.current?.dispose();
      scene.current = null;
    };
  }, []);
  function toggle() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const next = !still;
    document.documentElement.dataset.reserveStill = String(next);
    try {
      localStorage.setItem("reserve-motion-v1", next ? "still" : "motion");
    } catch {}
  }
  return (
    <div className="living-crest" data-crest-state={state}>
      <div className="living-crest__atmosphere" aria-hidden="true" />
      <div className="living-crest__art" ref={host} aria-hidden="true">
        {/* Native image intentionally supplies the no-JS and renderer-error fallback. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="living-crest__poster"
          src="/brand/legacy-reserve/living-crest/poster.webp"
          width={1024}
          height={1024}
          alt=""
          fetchPriority="high"
          decoding="async"
        />
      </div>
      <button
        className="living-crest__motion"
        hidden={!motionReady}
        type="button"
        onClick={toggle}
        aria-pressed={still}
        aria-label={
          still
            ? "Enable crest and environment motion"
            : "Pause crest and environment motion"
        }
      >
        <span aria-hidden="true">{still ? "▷" : "Ⅱ"}</span>{" "}
        {still ? "Still environment" : "Pause motion"}
      </button>
    </div>
  );
}
