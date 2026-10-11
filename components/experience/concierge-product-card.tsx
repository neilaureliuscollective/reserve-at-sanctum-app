"use client";
import { useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ProductRecommendation } from "@/lib/concierge-commerce";
export function trackConcierge(event: "concierge_opened" | "product_clicked") {
  void fetch("/api/aethelios/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event }), keepalive: true }).catch(() => {});
}
const price = (v: { amount: string; currencyCode: string }) => new Intl.NumberFormat("en-US", { style:"currency", currency:v.currencyCode }).format(Number(v.amount));
export function ConciergeProductCard({recommendation, checkout}:{recommendation:ProductRecommendation; checkout:boolean}) {
  const {product, evidence} = recommendation;
  const id = useId();
  const [variantId,setVariant] = useState(product.variants.find(v=>v.availableForSale)?.id ?? product.variants[0]?.id ?? "");
  const [busy,setBusy] = useState(false), [added,setAdded] = useState(false), [notice,setNotice] = useState("");
  const selected = product.variants.find(v=>v.id===variantId);
  async function add() {
    if (busy || added || !checkout || !selected?.availableForSale) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/shop/cart", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({action:"add",variantId,quantity:1,source:"aethelios"}) });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "This option could not be added. Please refresh its details.");
      // Inventory warnings can adjust quantities; only describe the returned Shopify state.
      const line = data.cart?.lines?.nodes?.find((l:{merchandise:{id:string};quantity:number})=>l.merchandise.id===variantId);
      if (!line) throw Error("Shopify did not retain this option in your cart. Please review product details.");
      setAdded(true); setNotice(`Your cart now contains ${line.quantity} of this option. Review your cart before checkout.`);
    } catch(e) {setNotice(e instanceof Error?e.message:"Please try again.");}
    finally {setBusy(false);}
  }
  return <article className="concierge-product" aria-labelledby={`${id}-name`}>
    {product.image ? <Image src={product.image.url} alt={product.image.alt} width={420} height={420} unoptimized sizes="(max-width:700px) 85vw, 300px"/> : <div className="concierge-product-placeholder" aria-hidden="true">LEGACY RESERVE</div>}
    <div className="concierge-product-body">
      <small>{product.category || product.productType || "THE COLLECTION"}</small>
      <h2 id={`${id}-name`}>{product.name}</h2>
      <p>{product.description.slice(0,400) || "A description has not been supplied."}</p>
      {evidence.length > 0 && <ul>{evidence.map((e,index)=><li key={index}>{e}</li>)}</ul>}
      <details><summary>Ingredients &amp; published details</summary><p>{product.attributes?.ingredients ? `Ingredients: ${product.attributes.ingredients}` : "Ingredients have not been supplied. Check the product label before use."}</p><p>{product.description}</p></details>
      <label htmlFor={`${id}-option`}>Product option</label>
      <select id={`${id}-option`} value={variantId} disabled={busy} onChange={e=>{setVariant(e.target.value);setAdded(false);setNotice("");}}>
        {product.variants.map(v=><option key={v.id} value={v.id}>{v.title} · {price(v.price)}{v.availableForSale?"":" · Unavailable"}</option>)}
      </select>
      <p className="concierge-product-price">{selected?price(selected.price):"No options published"}</p>
      <p className="concierge-product-stock">{selected?.availableForSale?"Available · checked again when added":"Currently unavailable"}</p>
      {checkout ? <button type="button" className="button button-gold" disabled={busy||added||!selected?.availableForSale} onClick={()=>void add()}>{busy?"Adding…":added?"Added to cart":`Add ${product.name} to cart`}</button> : <p>Purchasing is not open yet.</p>}
      <p role="status">{notice}</p>
      {added && <Link className="button button-gold" href="/shop/cart?source=aethelios">Review cart &amp; checkout ↗</Link>}
      <Link href={product.href} onClick={()=>trackConcierge("product_clicked")}>View {product.name} details ↗</Link>
    </div>
  </article>;
}
