"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ShopVariant } from "@/lib/shopify/storefront";
function price(variant: ShopVariant) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: variant.price.currencyCode,
  }).format(Number(variant.price.amount));
}
export function ProductCheckout({
  variants,
  enabled,
}: {
  variants: ShopVariant[];
  enabled: boolean;
  signedIn?: boolean;
}) {
  const router = useRouter();
  const [variantId, setVariant] = useState(
      variants.find((v) => v.availableForSale)?.id ?? variants[0]?.id ?? "",
    ),
    [quantity, setQuantity] = useState(1),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [added, setAdded] = useState(false);
  const selected = variants.find((v) => v.id === variantId);
  function reset() {
    setAdded(false);
    setNotice("");
  }
  async function prepare() {
    if (busy || added) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/shop/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", variantId, quantity }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Your product could not be added.");
      setAdded(true);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="collection-purchase" aria-labelledby="purchase-title">
      <h2 id="purchase-title">Choose your essentials.</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void prepare();
        }}
      >
        <label>
          Product option
          <select
            disabled={busy}
            value={variantId}
            onChange={(e) => {
              setVariant(e.target.value);
              reset();
            }}
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id} disabled={!v.availableForSale}>
                {v.title} · {price(v)}
                {v.availableForSale ? "" : " · Unavailable"}
              </option>
            ))}
          </select>
        </label>
        <p className="collection-price">
          {selected ? price(selected) : "No product options available"}
        </p>
        <p className="reserve-field-note">
          {selected?.availableForSale
            ? "Available according to Shopify. Availability is checked again when adding to your cart."
            : "This option is not currently available."}
        </p>
        <label>
          Quantity
          <select
            disabled={busy}
            value={quantity}
            onChange={(e) => {
              setQuantity(Number(e.target.value));
              reset();
            }}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <p className="reserve-field-note">
          This is a one-time product purchase. Membership billing and member
          product discounts are not active. Shopify confirms shipping, taxes and
          the final total.
        </p>
        {!enabled ? (
          <p className="reserve-notice">Purchasing is not open yet.</p>
        ) : (
          <button
            className="button button-gold"
            disabled={busy || !selected?.availableForSale || added}
          >
            {busy
              ? "Adding…"
              : added
                ? "Added to cart"
                : "Add to cart"}
          </button>
        )}
      </form>
      <p role="status" className="reserve-notice">
        {notice}
      </p>
      {notice && (
        <button
          className="text-link"
          onClick={() => {
            reset();
            router.refresh();
          }}
        >
          Refresh product options ↗
        </button>
      )}
      {added && <div className="collection-handoff"><p role="status">Added to your cart.</p><Link href="/shop/cart" className="button button-gold">View cart ↗</Link><Link href="/shop" className="text-link">Continue shopping ↗</Link></div>}
    </section>
  );
}
