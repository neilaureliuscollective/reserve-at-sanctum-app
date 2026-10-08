import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductConcept } from "@/lib/product-concepts";
import { locationDisplayName, primaryLocation } from "@/lib/experience/locations";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const item = getProductConcept((await params).id);
  return { title: item ? `${item.name} · Shop` : "Shop" };
}

export default async function ShopConcept({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = getProductConcept(id);
  if (!item) notFound();
  return (
    <main id="main" className="reserve-room shop-room">
      <div className="room-backdrop" aria-hidden="true">
        <Image src={item.src} alt="" fill sizes="100vw" priority />
      </div>
      <section className="room-intro">
        <p className="experience-kicker">{locationDisplayName(primaryLocation.id).toUpperCase()} · CONCEPT</p>
        <h1 tabIndex={-1}>{item.name}</h1>
        <p className="room-line">{item.description}</p>
        <div className="visit-ledger">
          <span className="experience-kicker">NOT AVAILABLE FOR PURCHASE</span>
          <p>
            This is a labeled concept preview. This concept is not a published inventory record,
            so it has no verified price, stock, or checkout.
          </p>
          <div className="room-actions">
            <Link href="/shop" className="button button-gold">Return to Shop</Link>
            <Link href="/my-reserve" className="text-link">Open My Reserve ↗</Link>
          </div>
        </div>
        <small className="room-concept">CONCEPT PACKAGE · NOT A LIVE PRODUCT RECORD</small>
      </section>
    </main>
  );
}
