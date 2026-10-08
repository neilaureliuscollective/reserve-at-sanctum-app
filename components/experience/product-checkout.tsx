"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ShopVariant, PreparedCheckout } from "@/lib/shopify/storefront";
function price(variant: ShopVariant) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: variant.price.currencyCode,
  }).format(Number(variant.price.amount));
}
export function ProductCheckout({
  variants,
  enabled,
  signedIn,
}: {
  variants: ShopVariant[];
  enabled: boolean;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [variantId, setVariant] = useState(
      variants.find((v) => v.availableForSale)?.id ?? variants[0]?.id ?? "",
    ),
    [quantity, setQuantity] = useState(1),
    [attempt, setAttempt] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [prepared, setPrepared] = useState<PreparedCheckout | null>(null);
  const selected = variants.find((v) => v.id === variantId);
  function reset() {
    setAttempt("");
    setPrepared(null);
    setNotice("");
  }
  async function prepare() {
    if (busy || prepared) return;
    const key = attempt || crypto.randomUUID();
    setAttempt(key);
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptKey: key, variantId, quantity }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Checkout could not prepare.");
      setPrepared(result);
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
            ? "Available according to Shopify. Availability is checked again when preparing checkout."
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
        ) : !signedIn ? (
          <button
            className="button button-gold"
            type="button"
            onClick={() =>
              router.push(
                `/signin?next=${encodeURIComponent(window.location.pathname)}`,
              )
            }
          >
            Sign in to prepare checkout ↗
          </button>
        ) : (
          <button
            className="button button-gold"
            disabled={busy || !selected?.availableForSale || Boolean(prepared)}
          >
            {busy
              ? "Preparing…"
              : prepared
                ? "Checkout prepared"
                : "Prepare checkout"}
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
      {prepared && (
        <div className="collection-handoff">
          <p className="experience-kicker">
            CHECKOUT PREPARED · NOT A PURCHASE
          </p>
          <p>
            Estimated total:{" "}
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: prepared.estimatedTotal.currencyCode,
            }).format(Number(prepared.estimatedTotal.amount))}
          </p>
          <p>
            Continue to Shopify to review shipping, taxes and final pricing.
            Nothing has been charged by Legacy Reserve.
          </p>
          <a
            href={prepared.url}
            className="button button-gold"
            rel="noreferrer"
          >
            Continue to Shopify checkout ↗
          </a>
        </div>
      )}
    </section>
  );
}
