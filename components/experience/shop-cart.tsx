"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { PublicCart } from "@/lib/shopify/cart";
export function ShopCart() {
 const [cart,setCart]=useState<PublicCart|null>(null),[busy,setBusy]=useState(true),[notice,setNotice]=useState("");
 async function refresh() {
  setBusy(true);setNotice("");
  try { const r=await fetch("/api/shop/cart");const data=await r.json();if(!r.ok)throw Error(data.error);setCart(data.cart); }
  catch(e){setNotice(e instanceof Error?e.message:"Your cart could not refresh.");}finally{setBusy(false);}
 }
 useEffect(()=>{void refresh();},[]);
 async function change(action:object) {
  setBusy(true);setNotice("");
  try {const r=await fetch("/api/shop/cart",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(action)});const data=await r.json();if(!r.ok)throw Error(data.error);setCart(data.cart);if(data.url)window.location.assign(data.url);}
  catch(e){setNotice(e instanceof Error?e.message:"Please try again.");}finally{setBusy(false);}
 }
 const money=(v:{amount:string;currencyCode:string})=>new Intl.NumberFormat("en-US",{style:"currency",currency:v.currencyCode}).format(Number(v.amount));
 return <section className="collection-purchase" aria-label="Shopping cart" aria-busy={busy}>
 <p role="status">{notice || (busy?"Refreshing your cart…":"")}</p>
 {notice && <button className="text-link" onClick={()=>void refresh()}>Refresh cart ↗</button>}
 {cart?.lines.nodes.map(line=><article key={line.id} className="collection-cart-line">
 <Link href={`/shop/products/${line.merchandise.product.handle}`}><h2>{line.merchandise.product.title}</h2></Link>
 <p>{line.merchandise.title} · {money(line.cost.totalAmount)}</p>
 {!line.merchandise.availableForSale && <p>Currently unavailable. Remove this item to continue.</p>}
 <label>Quantity <select value={line.quantity} disabled={busy} onChange={e=>void change({action:"update",lineId:line.id,quantity:Number(e.target.value)})}>
 {[...new Set([1,2,3,4,5,line.quantity])].sort((a,b)=>a-b).map(n=><option key={n} value={n}>{n}</option>)}</select></label>
 <button className="text-link" disabled={busy} onClick={()=>void change({action:"remove",lineId:line.id})}>Remove {line.merchandise.product.title}</button>
 </article>)}
 {cart?.totalQuantity ? <><p className="collection-price">Estimated total: {money(cart.cost.totalAmount)}</p><p>Shipping, taxes and final pricing are confirmed at checkout.</p><button className="button button-gold" disabled={busy||cart.lines.nodes.some(l=>!l.merchandise.availableForSale)} onClick={()=>void change({action:"checkout"})}>Continue to Shopify checkout ↗</button></> : !busy && !notice && <p>Your cart is empty.</p>}
 <p><Link href="/shop" className="text-link">Continue shopping ↗</Link></p>
 </section>;
}
