import Image from "next/image";
import Link from "next/link";
import { liveShopCatalog } from "@/lib/commerce";
import { productConcepts } from "@/lib/product-concepts";
import { locationDisplayName, primaryLocation } from "@/lib/experience/locations";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shop" };

export default async function Shop() {
  const catalog = await liveShopCatalog();
  const house = locationDisplayName(primaryLocation.id);
  return (
    <main id="main" className="reserve-room shop-room">
      <div className="room-backdrop" aria-hidden="true">
        <Image src={primaryLocation.poster} alt="" fill sizes="100vw" priority />
      </div>
      <section className="room-intro">
        <p className="experience-kicker">{house.toUpperCase()} · SHOP</p>
        <h1 tabIndex={-1}>What a man takes home.</h1>
        <p className="room-line">
          Products, replenishment, and member pricing will live here when Square Catalog is connected.
          Nothing on this page is live inventory.
        </p>
        <div className="visit-ledger shop-ledger">
          <span className="experience-kicker">{catalog.connected ? "SQUARE CATALOG" : "SQUARE NOT CONNECTED"}</span>
          {catalog.connected && catalog.liveCatalog ? (
            <ul className="shop-live">
              {catalog.items.map((item) => (
                <li key={item.id}>{item.name}</li>
              ))}
            </ul>
          ) : (
            <>
              <h2>The house collection is being prepared.</h2>
              <p>
                {catalog.connected
                  ? "Square is configured, but no sellable catalog objects are available yet."
                  : "Square credentials have not been added. Checkout, inventory, and orders stay disabled."}
              </p>
            </>
          )}
        </div>
        <small className="room-concept">CONCEPT PREVIEWS · NOT LIVE INVENTORY OR PRICES</small>
      </section>
      <section className="shop-concepts" aria-labelledby="shop-concepts-title">
        <p className="experience-kicker" id="shop-concepts-title">CONCEPT COLLECTION</p>
        <div className="shop-grid">
          {productConcepts.map((item) => (
            <Link key={item.id} href={`/shop/${item.id}`} className="shop-concept">
              <Image src={item.src} alt={item.alt} width={280} height={280} />
              <span>{item.family}</span>
              <strong>{item.name}</strong>
              <small>{item.description}</small>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
