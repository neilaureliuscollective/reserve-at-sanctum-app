import Image from "next/image";
import Link from "next/link";
import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readCollection } from "@/lib/collection";
import { MemberShell } from "@/components/experience/member-shell";
import { ProductCheckout } from "@/components/experience/product-checkout";
import { ProductGallery } from "@/components/experience/product-gallery";
import { ProductConcierge } from "@/components/experience/product-concierge";
import { productDetail } from "@/lib/product-universe";
import { moneyLabel } from "@/lib/shopify/storefront";
import "./product-universe.css";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ handle: string }> };
const load = cache(async (handle: string) => {
  if (!/^[a-z0-9][a-z0-9_-]{0,199}$/.test(handle)) notFound();
  const catalog = await readCollection();
  const product = catalog.items.find(p => p.handle === handle);
  return { catalog, product, detail: product ? await productDetail(product) : null };
});
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { product } = await load((await params).handle);
  return { title: product?.name || "Collection product", description: product?.description.slice(0, 160), ...(product ? { alternates: { canonical: product.href }, openGraph: { title: product.name, description: product.description.slice(0,160), images: product.image ? [product.image.url] : [] } } : {}) };
}
export default async function Product({ params }: Props) {
  const { catalog, product, detail } = await load((await params).handle);
  if (catalog.state === "unavailable") return <MemberShell kicker="THE COLLECTION" title="Product information could not refresh." intro="Please check again before purchasing. No purchase has been prepared."><Link href="/shop" className="button button-gold">Return to the Collection ↗</Link></MemberShell>;
  if (!product || !detail) notFound();
  const { editorial } = detail;
  const companions = editorial.complementaryHandles.flatMap(handle => {
    const p = catalog.items.find(p => p.handle === handle && p.handle !== product.handle);
    return p ? [p] : [];
  });
  const structured = { "@context": "https://schema.org", "@type": "Product", name: product.name, description: product.description, image: detail.images.map(i => i.url), offers: product.variants.map(v => ({ "@type": "Offer", sku: v.id, price: v.price.amount, priceCurrency: v.price.currencyCode, availability: `https://schema.org/${v.availableForSale ? "InStock" : "OutOfStock"}`, url: product.href })) };
  return <main id="main" className={`product-universe universe-family-${editorial.family}`}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, "\\u003c") }} />
    <nav className="universe-breadcrumb" aria-label="Breadcrumb"><Link href="/shop">The Collection</Link><span>/</span><span>{product.name}</span><Link href="/shop/cart">Your cart ↗</Link></nav>
    <div className="universe-hero">
      <ProductGallery images={detail.images} name={product.name} />
      <div className="universe-product-copy"><p className="universe-kicker">LEGACY RESERVE / {editorial.family === "essential" ? "CONSIDERED ESSENTIALS" : `${editorial.family.toUpperCase()} COLLECTION`}</p><h1>{product.name}</h1><p className="universe-introduction">{editorial.introduction || "A standard to return to. An essential to make your own."}</p>
        <div id="purchase"><ProductCheckout key={JSON.stringify(product.variants)} variants={product.variants} enabled={catalog.checkout} /></div>
        <div className="universe-purchase-trust"><a href="#product-confidence">Shipping & returns ↗</a><a href="#product-intelligence">Explore the product ↓</a></div>
      </div>
    </div>
    <nav className="universe-chapters" aria-label="Product chapters"><a href="#product-intelligence">01 / Intelligence</a><a href="#product-ritual">02 / Ritual</a><a href="#product-concierge">03 / Concierge</a><a href="#product-confidence">04 / Confidence</a></nav>
    <section id="product-intelligence" className="universe-intelligence"><div><p className="universe-kicker">01 / PRODUCT INTELLIGENCE</p><h2>Understand the essential.</h2><p className="universe-description">{product.description || "A detailed product description has not yet been published."}</p></div><div className="universe-formulation"><h3>Inside the formulation</h3>{editorial.ingredients.length ? editorial.ingredients.map(i => <details key={i.name}><summary>{i.name}<span aria-hidden="true"> +</span></summary><p>{i.explanation}</p></details>) : <p>Ingredient details have not yet been published here. Consult the product packaging for the full ingredient list.</p>}{editorial.specifications.length > 0 && <dl>{editorial.specifications.map(s => <div key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></div>)}</dl>}</div></section>
    <section id="product-ritual" className="universe-ritual"><p className="universe-kicker">02 / YOUR DAILY RITUAL</p><h2>Make it part of your day.</h2>{editorial.ritual.length ? <ol>{editorial.ritual.map((s, n) => <li key={s.title}><span>{String(n + 1).padStart(2,"0")}</span><h3>{s.title}</h3><p>{s.instruction}</p></li>)}</ol> : <p>Follow the directions supplied with this product. A guided ritual will appear here when verified usage instructions are published.</p>}</section>
    <ProductConcierge handle={product.handle} name={product.name} />
    {companions.length > 0 && <section className="universe-companions"><p className="universe-kicker">CONSIDERED TOGETHER</p><h2>Complete your ritual.</h2><div>{companions.map(p => <Link key={p.id} href={p.href}>{p.image && <Image src={p.image.url} alt={p.image.alt} width={400} height={400} unoptimized />}<h3>{p.name}</h3><p>{p.variants[0] ? moneyLabel(p.variants[0].price) : "Review options"} ↗</p></Link>)}</div></section>}
    <section id="product-confidence" className="universe-confidence"><div><p className="universe-kicker">04 / PURCHASE WITH CLARITY</p><h2>Every detail matters.</h2><p>Current options and availability come from Shopify. Your selection is checked again when added to your cart. Final shipping, taxes and totals are confirmed at checkout.</p><p>One-time purchasing. Member discounts and subscriptions are not currently active.</p></div><div>{detail.policies.length ? detail.policies.map(p => <details key={p.label}><summary>{p.label} +</summary><p>{p.text}</p></details>) : <p>Shipping and return policies could not be loaded here. Confirm the store’s terms at checkout before placing your order.</p>}<Link href="/shop/cart">Review your cart ↗</Link></div></section>
    <div className="universe-mobile-purchase"><span>{product.name}</span><a href="#purchase" className="button button-gold">{catalog.checkout && product.variants.some(v => v.availableForSale) ? "Choose & purchase ↑" : "Review options ↑"}</a></div>
  </main>;
}
