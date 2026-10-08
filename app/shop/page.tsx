import Image from "next/image";
import Link from "next/link";
import { readCollection } from "@/lib/collection";
import { productConcepts } from "@/lib/product-concepts";
import { MemberShell } from "@/components/experience/member-shell";
import { moneyLabel } from "@/lib/shopify/storefront";
export const dynamic = "force-dynamic";
export const metadata = { title: "Collection" };
export default async function Shop() {
  const catalog = await readCollection();
  return (
    <MemberShell
      kicker="THE LEGACY RESERVE COLLECTION"
      title="A standard you can carry."
      intro="Considered essentials for your everyday presence. Explore the collection, with a clear distinction between published products and concepts."
    >
      <section
        className="collection-status"
        aria-labelledby="collection-status-title"
      >
        <p className="experience-kicker">
          {catalog.state === "ready"
            ? "PUBLISHED COLLECTION"
            : catalog.state === "unavailable"
              ? "COLLECTION UNAVAILABLE"
              : "IN PREPARATION"}
        </p>
        <h2 id="collection-status-title">
          {catalog.state === "ready"
            ? "Choose what belongs in your routine."
            : catalog.state === "unavailable"
              ? "The live Collection could not refresh."
              : "The collection is taking shape."}
        </h2>
        <p>{catalog.message}</p>
        <p className="reserve-field-note">
          Member pricing and recurring membership billing are not active.
        </p>
        {catalog.state === "unavailable" && (
          <Link href="/shop" className="text-link">
            Try again ↗
          </Link>
        )}
      </section>
      {catalog.state === "ready" && catalog.items.length > 0 && (
        <section
          className="collection-products"
          aria-label="Published products"
        >
          {catalog.items.map((item) => {
            const available = item.variants.filter((v) => v.availableForSale);
            const prices = (available.length ? available : item.variants).map(
              (v) => Number(v.price.amount),
            );
            const lowest = prices.length ? Math.min(...prices) : null;
            return (
              <Link
                className="collection-product"
                key={item.id}
                href={item.href}
              >
                {item.image ? (
                  <Image
                    src={item.image.url}
                    alt={item.image.alt}
                    width={500}
                    height={500}
                    unoptimized
                    sizes="(max-width:700px) 100vw, 33vw"
                  />
                ) : (
                  <div className="collection-no-image">LEGACY RESERVE</div>
                )}
                <span className="experience-kicker">PUBLISHED PRODUCT</span>
                <h2>{item.name}</h2>
                <p>
                  {lowest !== null
                    ? (new Set(prices).size > 1 ? "From " : "") +
                      moneyLabel({
                        amount: String(lowest),
                        currencyCode: "USD",
                      })
                    : "Options unavailable"}
                </p>
                <small>
                  {item.variants.some((v) => v.availableForSale)
                    ? catalog.checkout
                      ? "Review product options ↗"
                      : "Explore · purchasing not open"
                    : "Currently unavailable"}
                </small>
              </Link>
            );
          })}
        </section>
      )}
      {Boolean(catalog.readOnlyItems?.length) && (
        <section className="collection-status">
          <p className="experience-kicker">CONNECTED CATALOG · READ ONLY</p>
          <ul>
            {catalog.readOnlyItems?.map((item) => (
              <li key={item.id}>{item.name}</li>
            ))}
          </ul>
          <p>
            These catalog names do not establish stock, pricing or purchasing
            availability.
          </p>
        </section>
      )}
      <section className="shop-concepts" aria-labelledby="shop-concepts-title">
        <p className="experience-kicker" id="shop-concepts-title">
          CONCEPT COLLECTION · NOT LIVE INVENTORY
        </p>
        <p className="reserve-field-note">
          Packaging concepts below have no purchase price, stock or checkout.
          They remain separate from any published Shopify product.
        </p>
        <div className="shop-grid">
          {productConcepts.map((item) => (
            <Link
              key={item.id}
              href={`/shop/${item.id}`}
              className="shop-concept"
            >
              <Image src={item.src} alt={item.alt} width={280} height={280} />
              <span>{item.family}</span>
              <strong>{item.name}</strong>
              <small>{item.description}</small>
            </Link>
          ))}
        </div>
      </section>
      <section className="member-line">
        <div>
          <p className="experience-kicker">YOUR ROUTINE</p>
          <h2>Start with what matters.</h2>
          <p>
            Shape a simple presence routine before choosing products for it.
          </p>
        </div>
        <Link href="/pathways?priority=presence" className="text-link">
          Your presence pathway ↗
        </Link>
      </section>
    </MemberShell>
  );
}
