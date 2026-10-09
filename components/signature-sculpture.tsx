"use client";
import type { Priority } from "@aethelios/concierge-core";
import { useArtworkMotion } from "./use-artwork-motion";
const names = { presence: "The Standard", performance: "The Engine", wellness: "The Core" };

export function SignatureSculpture({ world = "wellness", quiet = false }: { world?: Priority; quiet?: boolean }) {
  const { host, state, still, ready, toggle } = useArtworkMotion(quiet);
  const base = `/brand/legacy-reserve/emblems/${world}`;
  return (
    <div className={`signature-sculpture${quiet ? " is-quiet" : ""}`} data-world={world} data-sculpture-state={state} data-artwork="generated-v1">
      <div className="signature-sculpture__art" ref={host} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="signature-sculpture__poster" src={`${base}-1280-v1.webp`}
          srcSet={`${base}-640-v1.webp 640w, ${base}-1280-v1.webp 1280w`}
          sizes="(max-width: 700px) 300px, 440px"
          alt="" width={1280} height={1280} decoding="async" loading="lazy" />
      </div>
      <div className="signature-sculpture__caption">
        <span>{world === "wellness" ? "VITALIS" : world.toUpperCase()}</span>
        <strong>{names[world]}</strong>
      </div>
      {!quiet && <div className="signature-sculpture__control">
        <button hidden={!ready} type="button" className="signature-sculpture__motion" onClick={toggle}
          aria-pressed={still} aria-label={still ? "Enable sculpture and environment motion" : "Pause sculpture and environment motion"}>
          {still ? "▷ Enable motion" : "Ⅱ Pause motion"}
        </button>
      </div>}
    </div>
  );
}
