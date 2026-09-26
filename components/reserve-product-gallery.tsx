"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";

const products = [
  { name: "Vitalis", description: "Hair & beard oil · Obsidian Vale", src: "/images/cinematic/vitalis-cutout.webp", alt: "Legacy Reserve Vitalis Hair and Beard Oil concept package", family: "GROOMING" },
  { name: "Obsidian Wash", description: "Body wash · Cedar Smoke", src: "/images/cinematic/obsidian-wash-cutout.webp", alt: "Legacy Reserve Obsidian Wash concept package", family: "GROOMING" },
  { name: "Obsidian Crème", description: "Face moisturizer · Midnight Orchid", src: "/images/cinematic/obsidian-creme-cutout.webp", alt: "Legacy Reserve Obsidian Crème concept package", family: "GROOMING" },
  { name: "HYDROS", description: "Hydration + electrolytes · Citrus Reserve", src: "/images/cinematic/hydros-cutout.webp", alt: "Legacy Reserve HYDROS concept package", family: "BEYOND THE VISIT" },
  { name: "ASCEND", description: "Pre-workout · Georgia Peach Rings", src: "/images/cinematic/ascend-cutout.webp", alt: "Legacy Reserve ASCEND concept package", family: "BEYOND THE VISIT" },
] as const;

export function ReserveProductGallery() {
  const [active, setActive] = useState(0);
  const product = products[active];
  return <div className="film-product">
    <div className="film-product__object" key={product.src}><Image src={product.src} alt={product.alt} fill sizes="(max-width: 760px) 65vw, 28vw" /></div>
    <div className="film-product__detail" aria-live="polite" aria-atomic="true"><span>LEGACY RESERVE / {product.family}</span><h3>{product.name}</h3><p>{product.description}</p><small>PRODUCT CONCEPT · COLLECTION PREVIEW</small></div>
    <div className="film-product__shelf" role="group" aria-label="Explore Legacy Reserve product concepts">{products.map((item, index) => <button key={item.name} type="button" aria-pressed={active === index} onClick={() => setActive(index)} aria-label={`Show ${item.name}`}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.name}</strong></button>)}</div>
    <p className="film-product__note">A first look at the collection. Final packaging, pricing and availability will be introduced as products are ready. <Link href="/gent-ascend">Explore Gent Ascend <ArrowUpRight size={15} /></Link></p>
  </div>;
}
