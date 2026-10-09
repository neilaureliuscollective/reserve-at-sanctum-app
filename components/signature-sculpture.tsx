"use client";
import { useEffect, useRef, useState } from "react";
import type { Priority } from "@aethelios/concierge-core";
import type { createSignatureScene } from "./signature-sculpture-scene";

const names = {
  presence: "The Standard",
  performance: "The Engine",
  wellness: "The Core",
};
export function SignatureSculpture({
  world = "wellness",
  quiet = false,
}: {
  world?: Priority;
  quiet?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null),
    scene = useRef<ReturnType<typeof createSignatureScene> | null>(null);
  const [state, setState] = useState("poster"),
    [still, setStill] = useState(true),
    [ready, setReady] = useState(false);
  useEffect(() => {
    if (quiet) return;
    const node = host.current;
    if (!node) return;
    setReady(true);
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false,
      loading = false,
      failed = false,
      closed = false;
    const isStill = () =>
      media.matches || document.documentElement.dataset.reserveStill === "true";
    const update = async () => {
      if (closed) return;
      const paused = isStill();
      setStill(paused);
      const active = visible && !document.hidden && !paused;
      if (!active) {
        scene.current?.dispose();
        scene.current = null;
        setState(failed ? "fallback" : "poster");
        return;
      }
      if (scene.current) {
        scene.current.setActive(true);
        setState("active");
        return;
      }
      if (failed || loading) return;
      loading = true;
      setState("loading");
      try {
        const { createSignatureScene } =
          await import("./signature-sculpture-scene");
        loading = false;
        if (closed || !visible || document.hidden || isStill()) {
          if (!closed) setState("poster");
          return;
        }
        scene.current = createSignatureScene(node, world, () => {
          failed = true;
          scene.current = null;
          if (!closed) setState("fallback");
        });
        scene.current.setActive(true);
        setState("active");
      } catch {
        loading = false;
        failed = true;
        if (!closed) setState("fallback");
      }
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        void update();
      },
      { threshold: 0.15 },
    );
    observer.observe(node);
    const sync = () => void update(),
      mutation = new MutationObserver(sync);
    mutation.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-reserve-still"],
    });
    media.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    const move = (event: PointerEvent) => {
        if (event.pointerType !== "mouse") return;
        const bounds = node.getBoundingClientRect();
        scene.current?.setPointer(
          (event.clientX - bounds.left) / bounds.width - 0.5,
          (event.clientY - bounds.top) / bounds.height - 0.5,
        );
      },
      rest = () => scene.current?.setPointer(0, 0);
    node.addEventListener("pointermove", move, { passive: true });
    node.addEventListener("pointerleave", rest);
    return () => {
      closed = true;
      observer.disconnect();
      mutation.disconnect();
      media.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerleave", rest);
      scene.current?.dispose();
      scene.current = null;
    };
  }, [world, quiet]);
  function toggle() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const next = !still;
    document.documentElement.dataset.reserveStill = String(next);
    try {
      localStorage.setItem("reserve-motion-v1", next ? "still" : "motion");
    } catch {}
  }
  return (
    <div
      className={`signature-sculpture${quiet ? " is-quiet" : ""}`}
      data-world={world}
      data-sculpture-state={state}
    >
      <div className="signature-sculpture__art" ref={host} aria-hidden="true">
        <img
          className="signature-sculpture__poster"
          src={`/brand/legacy-reserve/sculptures/${world}.webp`}
          alt=""
          width={720}
          height={720}
          decoding="async"
        />
      </div>
      <div className="signature-sculpture__caption">
        <span>{world === "wellness" ? "VITALIS" : world.toUpperCase()}</span>
        <strong>{names[world]}</strong>
      </div>
      {!quiet && (
        <div className="signature-sculpture__control">
          <button
            hidden={!ready}
            type="button"
            className="signature-sculpture__motion"
            onClick={toggle}
            aria-pressed={still}
            aria-label={
              still
                ? "Enable sculpture and environment motion"
                : "Pause sculpture and environment motion"
            }
          >
            {still ? "▷ Enable motion" : "Ⅱ Pause motion"}
          </button>
        </div>
      )}
    </div>
  );
}
