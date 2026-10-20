"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import type { ProductImage } from "@/lib/product-universe";
export function ProductGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [index, setIndex] = useState(0), [failed, setFailed] = useState<string[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const selected = images[index];
  const usable = selected && !failed.includes(selected.url);
  return <section className="universe-gallery" aria-label={`${name} photography`}>
    <div className="universe-stage">
      <span className="universe-stage-label">LEGACY RESERVE / THE COLLECTION</span>
      {usable ? <button className="universe-image-button" onClick={() => dialog.current?.showModal()} aria-label={`Enlarge ${selected.alt}`}>
        <Image src={selected.url} alt={selected.alt} width={1000} height={1000} unoptimized priority sizes="(max-width:800px) 100vw, 55vw" onError={() => setFailed(f => [...f, selected.url])} />
        <span className="universe-zoom">Explore the detail +</span>
      </button> : <div className="universe-media-fallback"><span>LR</span><p>Product photography is unavailable.</p></div>}
      <span className="universe-image-count">{images.length ? `${String(index + 1).padStart(2, "0")} / ${String(images.length).padStart(2, "0")}` : "THE COLLECTION"}</span>
    </div>
    {images.length > 1 && <div className="universe-thumbnails" aria-label="Choose a product image">{images.map((i, n) => <button key={i.url + n} aria-label={`View image ${n + 1}: ${i.alt}`} aria-pressed={index === n} onClick={() => setIndex(n)}><Image src={i.url} alt="" width={80} height={80} unoptimized loading="lazy" /></button>)}</div>}
    <dialog ref={dialog} className="universe-lightbox" onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
      <button autoFocus className="universe-close" onClick={() => dialog.current?.close()}>Close ×</button>
      {usable && <Image src={selected.url} alt={selected.alt} width={1600} height={1600} unoptimized />}
      <p>{selected?.alt}</p>
    </dialog>
  </section>;
}
