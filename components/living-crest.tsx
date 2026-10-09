"use client";
import { useArtworkMotion } from "./use-artwork-motion";

export function LivingCrest() {
  const { host, state, still, ready, toggle } = useArtworkMotion();
  return (
    <div className="living-crest" data-crest-state={state} data-artwork="generated-v1">
      <div className="living-crest__atmosphere" aria-hidden="true" />
      <div className="living-crest__art" ref={host} aria-hidden="true">
        {/* Native responsive images retain the artwork without JavaScript. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="living-crest__poster"
          src="/brand/legacy-reserve/emblems/crest-1280-v1.webp"
          srcSet="/brand/legacy-reserve/emblems/crest-640-v1.webp 640w, /brand/legacy-reserve/emblems/crest-1280-v1.webp 1280w"
          sizes="(max-width: 700px) 260px, (max-width: 1150px) 330px, 470px"
          width={1280} height={1280} alt="" fetchPriority="high" decoding="async" />
      </div>
      <button className="living-crest__motion" hidden={!ready} type="button" onClick={toggle}
        aria-pressed={still} aria-label={still ? "Enable crest and environment motion" : "Pause crest and environment motion"}>
        <span aria-hidden="true">{still ? "▷" : "Ⅱ"}</span>{" "}{still ? "Enable motion" : "Pause motion"}
      </button>
    </div>
  );
}
