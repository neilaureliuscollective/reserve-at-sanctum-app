"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";

const products = [
  { name: "Vitalis", description: "Hair & beard oil · Obsidian Vale", src: "/images/approved/vitalis.webp", alt: "Legacy Reserve Vitalis Hair and Beard Oil concept package, black pump bottle with green and gold label", family: "GROOMING" },
  { name: "Obsidian Wash", description: "Body wash · Cedar Smoke", src: "/images/approved/obsidian-wash.webp", alt: "Legacy Reserve Obsidian Wash concept package, black pump bottle with green and gold label", family: "GROOMING" },
  { name: "Obsidian Crème", description: "Face moisturizer · Midnight Orchid", src: "/images/approved/obsidian-creme.webp", alt: "Legacy Reserve Obsidian Crème concept package, black jar with green and gold label", family: "GROOMING" },
  { name: "HYDROS", description: "Hydration + electrolytes · Citrus Reserve", src: "/images/approved/hydros.webp", alt: "Legacy Reserve HYDROS concept package, black supplement jar with green and gold label", family: "BEYOND THE VISIT" },
  { name: "ASCEND", description: "Pre-workout · Georgia Peach Rings", src: "/images/approved/ascend.webp", alt: "Legacy Reserve ASCEND concept package, black supplement jar with green and gold label", family: "BEYOND THE VISIT" },
] as const;

export function ReserveProductGallery() {
  const [active, setActive] = useState(0);
  const product = products[active];
  return <div className="journey-product">
    <div className="journey-product__shelf" role="group" aria-label="Explore Legacy Reserve product concepts">
      {products.map((item, index) => <button key={item.name} type="button" aria-pressed={active === index} onClick={() => setActive(index)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.name}</strong><small>{item.family}</small></button>)}
    </div>
    <div className="journey-product__stage">
      <div className="journey-product__lightbox"><Image key={product.src} src={product.src} alt={product.alt} fill sizes="(max-width: 760px) 90vw, 45vw" /></div>
      <div className="journey-product__detail" aria-live="polite" aria-atomic="true"><p>LEGACY RESERVE / {product.family}</p><h3>{product.name}</h3><span>{product.description}</span><small>PRODUCT CONCEPT · COLLECTION PREVIEW</small></div>
    </div>
    <div className="journey-product__foot"><p className="journey-product__note">A first look at the collection. Final packaging, pricing and availability will be introduced as products are ready.</p><Link href="/gent-ascend" className="journey-text-link">Explore Gent Ascend <ArrowUpRight size={18} /></Link></div>
  </div>;
}
