"use client";
import { useEffect, useRef, useState } from "react";
import { DateTime } from "luxon";
import Link from "next/link";
import type { Row } from "@/lib/db";
import type { Order, Line } from "@/domains/commerce/types";
import "./operations-workspace.css";
type Catalog = {
  settings: Row | null;
  skus: Row[];
  orders: Order[];
  openOrders: Order[];
  dailyMoney: { method: string; collected: string; refunded: string }[];
  events: Row[];
  canManage: boolean;
  canRefund: boolean;
  canDiscount: boolean;
  processorConfigured: boolean;
};
type Receipt = {
  order: Order;
  lines: Line[];
  payment: Row | null;
  refunds: Row[];
  returns: Row[];
};
const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n / 100,
  );
async function get<T>(path: string): Promise<T> {
  const r = await fetch(path, { cache: "no-store" }),
    d = await r.json();
  if (!r.ok) throw Error(d.error);
  return d;
}
async function post<T>(action: string, input: unknown): Promise<T> {
  const r = await fetch("/api/commerce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, input }),
    }),
    d = await r.json();
  if (!r.ok) throw Error(d.error);
  return d;
}
export function CommerceWorkspace() {
  const [locations, setLocations] = useState<Row[]>([]),
    [locationId, setLocation] = useState(""),
    [day, setDay] = useState(""),
    [catalog, setCatalog] = useState<Catalog | null>(null),
    [receipt, setReceipt] = useState<Receipt | null>(null),
    [visits, setVisits] = useState<Row[]>([]),
    [visitId, setVisit] = useState(""),
    [quantities, setQuantities] = useState<Record<string, number>>({}),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [discount, setDiscount] = useState("0"),
    [tip, setTip] = useState("0"),
    [editSku, setEditSku] = useState(""),
    [customers, setCustomers] = useState<Row[]>([]),
    [customerId, setCustomerId] = useState("");
  const orderKey = useRef(""),
    keys = useRef(new Map<string, { payload: string; key: string }>()),
    context = useRef("");
  context.current = `${locationId}:${day}`;
  function keyFor(type: string, input: unknown) {
    const payload = JSON.stringify(input),
      prior = keys.current.get(type);
    if (prior?.payload === payload) return prior.key;
    const key = crypto.randomUUID();
    keys.current.set(type, { payload, key });
    return key;
  }
  async function reload(id = locationId, date = day) {
    if (!id || !date) return;
    const d = await get<Catalog>(
      `/api/commerce?location=${encodeURIComponent(id)}&date=${date}`,
    );
    if (context.current === `${id}:${date}`) setCatalog(d);
  }
  async function openOrder(id: string) {
    const r = await get<Receipt>(`/api/commerce?order=${id}`);
    if (r.order.location_id === locationId) setReceipt(r);
  }
  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      await reload();
      if (receipt) await openOrder(receipt.order.id);
      setNotice("Saved.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to complete this action.",
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let live = true;
    get<{ locations: Row[] }>("/api/configuration")
      .then((d) => {
        if (!live) return;
        setLocations(d.locations);
        const p = new URL(location.href).searchParams;
        const selected =
          d.locations.find((l) => l.id === p.get("location")) || d.locations[0];
        if (selected) {
          setLocation(String(selected.id));
          setDay(
            p.get("date") ||
              DateTime.now().setZone(String(selected.timezone)).toISODate()!,
          );
          setVisit(p.get("visit") || "");
        }
      })
      .catch((e) => setError(e.message));
    orderKey.current = crypto.randomUUID();
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (!locationId || !day) return;
    let live = true;
    setCatalog(null);
    setReceipt(null);
    get<Catalog>(`/api/commerce?location=${locationId}&date=${day}`)
      .then((d) => {
        if (live) setCatalog(d);
      })
      .catch((e) => {
        if (live && locationId) setError(e.message);
      });
    get<{ visits: Row[] }>(
      `/api/appointments?studio=true&location=${locationId}&date=${day}`,
    )
      .then((d) => {
        if (live)
          setVisits(
            d.visits.filter((v) =>
              ["checked_in", "completed"].includes(String(v.status)),
            ),
          );
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [locationId, day]);
  const sku = catalog?.skus.find((s) => s.id === editSku);
  return (
    <main id="main" className="ops">
      <header className="ops-heading">
        <p className="eyebrow">RESERVE / COMMERCE</p>
        <h1>
          The visit. <em>The finish.</em>
        </h1>
        <p>Services and Legacy Reserve retail, reconciled together.</p>
        <div className="ops-context">
          <label>
            Location
            <select
              aria-label="Location"
              value={locationId}
              onChange={(e) => {
                setLocation(e.target.value);
                setVisit("");
                setCustomerId("");
                setCustomers([]);
                setQuantities({});
                setError("");
                orderKey.current = crypto.randomUUID();
              }}
            >
              {locations.map((l) => (
                <option key={String(l.id)} value={String(l.id)}>
                  {String(l.name)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sale date
            <input
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
          </label>
          <button onClick={() => reload().catch((e) => setError(e.message))}>
            Refresh
          </button>
        </div>
      </header>
      {error && (
        <p role="alert" className="ops-alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {catalog && (
        <>
          <section>
            <h2>Checkout</h2>
            {!catalog.settings?.enabled && (
              <p>
                Commerce is closed until this location's catalog, opening stock
                and tax configuration are approved.
              </p>
            )}
            <label>
              Service visit (optional)
              <select
                aria-label="Service visit"
                value={visitId}
                onChange={(e) => {
                  setVisit(e.target.value);
                  orderKey.current = crypto.randomUUID();
                }}
              >
                <option value="">Retail only / walk-in</option>
                {visitId && !visits.some((v) => v.id === visitId) && (
                  <option value={visitId}>Linked visit</option>
                )}
                {visits.map((v) => (
                  <option key={String(v.id)} value={String(v.id)}>
                    {String(v.client_name)} · {String(v.service_name)} ·{" "}
                    {money(Number(v.price))}
                  </option>
                ))}
              </select>
            </label>
            {!visitId && (
              <>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const q = String(
                      new FormData(e.currentTarget).get("q") || "",
                    );
                    get<{ customers: Row[] }>(
                      `/api/customers?location=${locationId}&provider=&q=${encodeURIComponent(q)}`,
                    )
                      .then((d) => setCustomers(d.customers))
                      .catch((e) => setError(e.message));
                  }}
                >
                  <label>
                    Find retail customer
                    <input name="q" maxLength={100} />
                  </label>
                  <button>Find customer</button>
                </form>
                <label>
                  Retail customer (optional)
                  <select
                    aria-label="Retail customer"
                    value={customerId}
                    onChange={(e) => {
                      setCustomerId(e.target.value);
                      orderKey.current = crypto.randomUUID();
                    }}
                  >
                    <option value="">Walk-in / no linked account</option>
                    {customers.map((c) => (
                      <option key={String(c.id)} value={String(c.id)}>
                        {String(c.name)}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <div>
              {catalog.skus
                .filter((s) => s.enabled)
                .map((s) => (
                  <div className="ops-receipt" key={String(s.id)}>
                    <h3>{String(s.name)}</h3>
                    <p>
                      Legacy Reserve · {money(Number(s.price))} ·{" "}
                      {Number(s.on_hand) - Number(s.reserved)} available /{" "}
                      {String(s.reserved)} held
                    </p>
                    <label>
                      Quantity — {String(s.name)}
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={quantities[String(s.id)] || 0}
                        onChange={(e) => {
                          setQuantities((q) => ({
                            ...q,
                            [String(s.id)]: Number(e.target.value),
                          }));
                          orderKey.current = crypto.randomUUID();
                        }}
                      />
                    </label>
                  </div>
                ))}
            </div>
            {catalog.canDiscount && (
              <label>
                Order discount ($)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => {
                    setDiscount(e.target.value);
                    orderKey.current = crypto.randomUUID();
                  }}
                />
              </label>
            )}
            <label>
              Tip ($)
              <input
                type="number"
                min="0"
                step="0.01"
                value={tip}
                onChange={(e) => {
                  setTip(e.target.value);
                  orderKey.current = crypto.randomUUID();
                }}
              />
            </label>
            <p>
              Configured tax: {Number(catalog.settings?.tax_bps || 0) / 100}%.
              Final totals are calculated and frozen by Reserve.
            </p>
            <button
              disabled={
                busy ||
                !catalog.settings?.enabled ||
                (!visitId && !Object.values(quantities).some((q) => q > 0))
              }
              onClick={() =>
                act(async () => {
                  const d = await post<{ order: Order }>("order", {
                    locationId,
                    ...(visitId
                      ? { appointmentId: visitId }
                      : customerId
                        ? { customerId }
                        : {}),
                    items: Object.entries(quantities)
                      .filter(([, q]) => q > 0)
                      .map(([skuId, quantity]) => ({ skuId, quantity })),
                    discount: Math.round(Number(discount) * 100),
                    tip: Math.round(Number(tip) * 100),
                    requestKey: orderKey.current,
                  });
                  await openOrder(d.order.id);
                })
              }
            >
              Create checkout
            </button>
          </section>
          {receipt && (
            <section aria-label="Selected order">
              <h2>Order {receipt.order.id.slice(0, 8)}</h2>
              <p>
                {receipt.order.status.replace("_", " ")} ·{" "}
                {money(receipt.order.total)} · refunded{" "}
                {money(receipt.order.refunded)}
              </p>
              {receipt.lines.map((l) => (
                <p key={l.id}>
                  {l.quantity} × {l.name} · {money(l.quantity * l.unit_price)} ·
                  discount {money(l.discount)} · tax {money(l.tax)}
                </p>
              ))}
              <p>Tip {money(receipt.order.tip)}</p>
              {receipt.order.status === "pending" &&
                typeof receipt.payment?.checkout_url === "string" && (
                  <a
                    href={receipt.payment.checkout_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Continue to secure card checkout
                  </a>
                )}
              <div className="ops-actions">
                {receipt.order.status === "draft" && (
                  <>
                    <button
                      disabled={busy}
                      onClick={() =>
                        act(() =>
                          post("cash", {
                            id: receipt.order.id,
                            revision: receipt.order.revision,
                          }),
                        )
                      }
                    >
                      Record cash received
                    </button>
                    <button
                      disabled={
                        busy ||
                        !catalog.processorConfigured ||
                        receipt.order.total < 50
                      }
                      onClick={() =>
                        act(async () => {
                          const d = await post<{ url: string }>("card", {
                            id: receipt.order.id,
                            revision: receipt.order.revision,
                          });
                          await openOrder(receipt.order.id);
                          void d;
                        })
                      }
                    >
                      Open secure card checkout
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        act(() =>
                          post("void", {
                            id: receipt.order.id,
                            revision: receipt.order.revision,
                          }),
                        )
                      }
                    >
                      Void draft / release stock
                    </button>
                  </>
                )}
                {receipt.order.status === "pending" && (
                  <>
                    <button
                      disabled={busy}
                      onClick={() =>
                        act(() =>
                          post("card", {
                            id: receipt.order.id,
                            revision: receipt.order.revision,
                          }),
                        )
                      }
                    >
                      Recover checkout link
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        act(() => post("reconcile", { id: receipt.order.id }))
                      }
                    >
                      Check processor status
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        act(() => post("expire", { id: receipt.order.id }))
                      }
                    >
                      Expire checkout / reconcile
                    </button>
                  </>
                )}
                <Link href={`/receipt/${receipt.order.id}`}>
                  Itemized receipt
                </Link>
              </div>
              {receipt.payment?.method === "stripe" &&
                receipt.payment?.state !== "succeeded" && (
                  <p>
                    Stock stays reserved until payment is verified or the
                    processor confirms expiry. Closing the checkout tab does not
                    release stock.
                  </p>
                )}
              {catalog.canRefund &&
                ["paid", "part_refunded"].includes(receipt.order.status) && (
                  <details>
                    <summary>Refund payment</summary>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        const input = {
                          orderId: receipt.order.id,
                          amount: Math.round(Number(f.get("amount")) * 100),
                          reason: String(f.get("reason")),
                        };
                        act(() =>
                          post("refund", {
                            ...input,
                            requestKey: keyFor(
                              `refund:${receipt.order.id}`,
                              input,
                            ),
                          }),
                        );
                      }}
                    >
                      <label>
                        Refund amount ($)
                        <input
                          name="amount"
                          type="number"
                          min="0.01"
                          step="0.01"
                          required
                        />
                      </label>
                      <label>
                        Refund reason
                        <input name="reason" required maxLength={300} />
                      </label>
                      <button disabled={busy}>
                        {receipt.payment?.method === "cash"
                          ? "Record cash refunded"
                          : "Request processor refund"}
                      </button>
                    </form>
                    <p>
                      Cash requires actual cash returned to the customer. A
                      processor request is not confirmation of a successful
                      refund.
                    </p>
                  </details>
                )}
              {receipt.refunds.map((r) => (
                <p key={String(r.id)}>
                  Refund {money(Number(r.amount))} · {String(r.state)} ·{" "}
                  {String(r.reason)}{" "}
                  {catalog.canRefund &&
                    ["creating", "pending"].includes(String(r.state)) && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          act(() => post("refund_reconcile", { id: r.id }))
                        }
                      >
                        Reconcile refund
                      </button>
                    )}
                </p>
              ))}
              {catalog.canRefund &&
                ["paid", "part_refunded", "refunded"].includes(
                  receipt.order.status,
                ) && (
                  <details>
                    <summary>Return sellable stock</summary>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        const input = {
                          orderId: receipt.order.id,
                          lineId: String(f.get("lineId")),
                          quantity: Number(f.get("quantity")),
                          reason: String(f.get("reason")),
                        };
                        act(() =>
                          post("return", {
                            ...input,
                            requestKey: keyFor(
                              `return:${receipt.order.id}`,
                              input,
                            ),
                          }),
                        );
                      }}
                    >
                      <label>
                        Product line
                        <select name="lineId">
                          {receipt.lines
                            .filter((l) => l.sku_id)
                            .map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.name}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label>
                        Units physically returned
                        <input
                          name="quantity"
                          type="number"
                          min="1"
                          max="100"
                          required
                        />
                      </label>
                      <label>
                        Condition / reason
                        <input name="reason" required maxLength={300} />
                      </label>
                      <button disabled={busy}>Confirm sellable return</button>
                    </form>
                    <p>
                      Refunding money does not automatically restock an opened
                      or unreturned product.
                    </p>
                  </details>
                )}
            </section>
          )}
          <section>
            <h2>Today's money</h2>
            {catalog.dailyMoney.map((m) => (
              <p key={m.method}>
                {m.method === "stripe" ? "Card processor" : "Cash"} · collected{" "}
                {money(Number(m.collected))} · refunded{" "}
                {money(Number(m.refunded))} · net{" "}
                {money(Number(m.collected) - Number(m.refunded))}
              </p>
            ))}
            {!catalog.dailyMoney.length && (
              <p>No settled collections or refunds on this date.</p>
            )}
            <h2>Unresolved checkouts</h2>
            {catalog.openOrders
              .filter((o) => !catalog.orders.some((today) => today.id === o.id))
              .map((o) => (
                <article className="ops-receipt" key={o.id}>
                  <p>
                    {o.id.slice(0, 8)} · {o.status} · {money(o.total)} · created{" "}
                    {new Date(o.created_at).toLocaleDateString()}
                  </p>
                  <button
                    onClick={() =>
                      openOrder(o.id).catch((e) => setError(e.message))
                    }
                  >
                    Recover order {o.id.slice(0, 8)}
                  </button>
                </article>
              ))}
            <h2>Daily sales</h2>
            <p>
              Collected gross:{" "}
              {money(
                catalog.orders
                  .filter((o) =>
                    ["paid", "part_refunded", "refunded"].includes(o.status),
                  )
                  .reduce((sum, o) => sum + o.total, 0),
              )}{" "}
              · successful refunds:{" "}
              {money(catalog.orders.reduce((sum, o) => sum + o.refunded, 0))}.
              Cash and processor collections require separate end-of-day
              matching; bank deposits and processor fees are not included.
            </p>
            {catalog.orders.map((o) => (
              <article className="ops-receipt" key={o.id}>
                <p>
                  {o.id.slice(0, 8)} · {o.status} · {money(o.total)} ·{" "}
                  {String(o.method || "not collected")}
                </p>
                <button
                  disabled={busy}
                  onClick={() =>
                    openOrder(o.id).catch((e) => setError(e.message))
                  }
                >
                  Open order {o.id.slice(0, 8)}
                </button>
              </article>
            ))}
          </section>
          {catalog.canManage && (
            <section>
              <h2>Inventory and commissioning</h2>
              <details>
                <summary>Stock count / receipt adjustment</summary>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    const input = {
                      action: "adjust",
                      locationId,
                      skuId: String(f.get("skuId")),
                      delta: Number(f.get("delta")),
                      reason: String(f.get("reason")),
                    };
                    act(() =>
                      post("configure", {
                        ...input,
                        requestKey: keyFor("adjust", input),
                      }),
                    );
                  }}
                >
                  <label>
                    Inventory SKU
                    <select aria-label="Inventory SKU" name="skuId">
                      {catalog.skus.map((s) => (
                        <option key={String(s.id)} value={String(s.id)}>
                          {String(s.name)} · {String(s.on_hand)} on hand /{" "}
                          {String(s.reserved)} held
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Unit change (positive receive / negative adjustment)
                    <input name="delta" type="number" step="1" required />
                  </label>
                  <label>
                    Count or receipt reason
                    <input name="reason" required maxLength={300} />
                  </label>
                  <button disabled={busy}>Record adjustment</button>
                </form>
              </details>
              <details>
                <summary>Legacy Reserve product catalog</summary>
                <label>
                  Edit product
                  <select
                    aria-label="Edit product"
                    value={editSku}
                    onChange={(e) => setEditSku(e.target.value)}
                  >
                    <option value="">Create approved SKU</option>
                    {catalog.skus.map((s) => (
                      <option key={String(s.id)} value={String(s.id)}>
                        {String(s.name)}
                      </option>
                    ))}
                  </select>
                </label>
                <form
                  key={`${editSku}:${sku?.revision}`}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    act(() =>
                      post("configure", {
                        action: "sku",
                        locationId,
                        ...(editSku ? { id: editSku } : {}),
                        sku: f.get("sku"),
                        name: f.get("name"),
                        description: f.get("description"),
                        price: Math.round(Number(f.get("price")) * 100),
                        taxable: f.has("taxable"),
                        enabled: f.has("enabled"),
                        revision: Number(sku?.revision || 0),
                      }),
                    );
                  }}
                >
                  <label>
                    SKU
                    <input
                      name="sku"
                      required
                      defaultValue={String(sku?.sku || "")}
                    />
                  </label>
                  <label>
                    Product name
                    <input
                      name="name"
                      required
                      defaultValue={String(sku?.name || "")}
                    />
                  </label>
                  <label>
                    Description
                    <input
                      name="description"
                      defaultValue={String(sku?.description || "")}
                    />
                  </label>
                  <label>
                    Approved price ($)
                    <input
                      name="price"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      defaultValue={sku ? Number(sku.price) / 100 : ""}
                    />
                  </label>
                  <label className="ops-check">
                    <input
                      name="taxable"
                      type="checkbox"
                      defaultChecked={Boolean(sku?.taxable)}
                    />
                    Taxable under approved configuration
                  </label>
                  <label className="ops-check">
                    <input
                      name="enabled"
                      type="checkbox"
                      defaultChecked={Boolean(sku?.enabled)}
                    />
                    Enabled
                  </label>
                  <button disabled={busy}>Save product</button>
                </form>
                <p>
                  Company catalog changes require owner access. Inventory in
                  Reserve is authoritative for these in-location units; no
                  Shopify synchronization is implied.
                </p>
              </details>
              <details>
                <summary>Commerce settings</summary>
                <form
                  key={String(catalog.settings?.revision)}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    act(() =>
                      post("configure", {
                        action: "settings",
                        locationId,
                        enabled: f.has("enabled"),
                        taxBps: Math.round(Number(f.get("rate")) * 100),
                        serviceTaxable: f.has("serviceTaxable"),
                        taxApproved: f.has("approved"),
                        taxNote: f.get("note"),
                        revision: Number(catalog.settings?.revision || 0),
                      }),
                    );
                  }}
                >
                  <label>
                    Approved tax rate (%)
                    <input
                      name="rate"
                      type="number"
                      min="0"
                      max="30"
                      step="0.01"
                      required
                      defaultValue={
                        Number(catalog.settings?.tax_bps || 0) / 100
                      }
                    />
                  </label>
                  <label>
                    Approval reference / applicability
                    <input
                      name="note"
                      required
                      maxLength={300}
                      defaultValue={String(catalog.settings?.tax_note || "")}
                    />
                  </label>
                  <label className="ops-check">
                    <input
                      name="serviceTaxable"
                      type="checkbox"
                      defaultChecked={Boolean(
                        catalog.settings?.service_taxable,
                      )}
                    />
                    Services taxable
                  </label>
                  <label className="ops-check">
                    <input
                      name="approved"
                      type="checkbox"
                      defaultChecked={Boolean(catalog.settings?.tax_approved)}
                    />
                    Tax configuration approved
                  </label>
                  <label className="ops-check">
                    <input
                      name="enabled"
                      type="checkbox"
                      defaultChecked={Boolean(catalog.settings?.enabled)}
                    />
                    Enable location commerce
                  </label>
                  <button disabled={busy}>Save commerce settings</button>
                </form>
              </details>
              {catalog.events.length > 0 && (
                <>
                  <h3>Processor exceptions</h3>
                  {catalog.events.map((e) => (
                    <p key={String(e.id)}>
                      {String(e.id)} · {String(e.type)} · reconciliation
                      required
                    </p>
                  ))}
                </>
              )}
            </section>
          )}
        </>
      )}
      <footer className="ops-footer">
        <Link href="/studio">Location operations</Link>
        <Link href="/account">Your account</Link>
      </footer>
    </main>
  );
}
