"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DateTime } from "luxon";
import type { Sale } from "@/domains/shopify";
import type { Page, ShopLocation, Stock } from "@/domains/shopify/client";
import type { Row } from "@/lib/db";
import "./operations-workspace.css";
type State = {
  configured: boolean;
  connection: {
    enabled: boolean;
    shopify_location_id: string;
    verified_at: string;
  } | null;
  canConfigure: boolean;
  canCorrect: boolean;
  sales: Sale[];
  events: Row[];
};
const money = (value: number | string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(value) / 100,
  );
async function request<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(path, {
    cache: "no-store",
    ...(body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error || "Unable to complete this request.");
  return data;
}
export function ShopifyWorkspace() {
  const [locations, setLocations] = useState<Row[]>([]),
    [location, setLocation] = useState(""),
    [day, setDay] = useState(
      DateTime.now().setZone("America/Chicago").toISODate() || "",
    ),
    [data, setData] = useState<State | null>(null),
    [remoteLocations, setRemoteLocations] = useState<ShopLocation[]>([]),
    [remoteLocation, setRemoteLocation] = useState(""),
    [visits, setVisits] = useState<Row[]>([]),
    [selected, setSelected] = useState(""),
    [visit, setVisit] = useState(""),
    [reason, setReason] = useState(""),
    [orderId, setOrderId] = useState(""),
    [cursor, setCursor] = useState<string | null>(null),
    [stock, setStock] = useState<Stock[]>([]),
    [stockCursor, setStockCursor] = useState<string | null>(null),
    [stockTime, setStockTime] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const context = useRef("");
  context.current = location;
  useEffect(() => {
    let live = true;
    request<{ locations: Row[] }>("/api/configuration")
      .then((d) => {
        if (live) {
          setLocations(d.locations);
          setLocation(String(d.locations[0]?.id || ""));
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (!location) return;
    let live = true;
    setData(null);
    setStock([]);
    setStockCursor(null);
    setStockTime("");
    setRemoteLocations([]);
    setRemoteLocation("");
    setSelected("");
    setVisit("");
    setReason("");
    setCursor(null);
    setNotice("");
    setError("");
    request<State>(`/api/shopify?location=${encodeURIComponent(location)}`)
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [location]);
  useEffect(() => {
    if (!location || !day) return;
    let live = true;
    setVisits([]);
    setVisit("");
    request<{ visits: Row[] }>(
      `/api/appointments?studio=true&location=${encodeURIComponent(location)}&date=${day}`,
    )
      .then((d) => {
        if (live)
          setVisits(
            d.visits.filter((v) =>
              ["checked_in", "completed"].includes(String(v.status)),
            ),
          );
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [location, day]);
  async function run(work: (id: string) => Promise<string>) {
    const id = location;
    if (!id || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const text = await work(id);
      const fresh = await request<State>(
        `/api/shopify?location=${encodeURIComponent(id)}`,
      );
      if (context.current === id) {
        setData(fresh);
        setNotice(text);
      }
    } catch (e) {
      if (context.current === id)
        setError(
          e instanceof Error ? e.message : "Unable to complete this request.",
        );
    } finally {
      setBusy(false);
    }
  }
  function post<T>(action: string, input: unknown) {
    return request<T>("/api/shopify", { action, input });
  }
  const selectedSale = data?.sales.find((s) => s.id === selected);
  return (
    <main id="main" className="ops">
      <header className="ops-heading">
        <p className="eyebrow">RESERVE / SHOPIFY POS</p>
        <h1>
          The visit. <em>The sale.</em>
        </h1>
        <p>Shopify takes the payment. Reserve connects the experience.</p>
        <div className="ops-context">
          <label>
            Reserve location
            <select
              aria-label="Reserve location"
              value={location}
              disabled={busy}
              onChange={(e) => setLocation(e.target.value)}
            >
              {locations.map((l) => (
                <option key={String(l.id)} value={String(l.id)}>
                  {String(l.name)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Visit date
            <input
              aria-label="Visit date"
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
          </label>
        </div>
      </header>
      {error ? (
        <p role="alert" className="ops-alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="ops-notice">
          {notice}
        </p>
      ) : null}
      {!data ? (
        <p>Loading commerce connection…</p>
      ) : (
        <>
          <section>
            <h2>One register. One stock record.</h2>
            <p>
              Take card or cash payments, send official receipts, issue refunds
              and restock returns in Shopify POS. Prices and stock stay in
              Shopify.
            </p>
            <p>
              Reserve does not charge a card, issue a refund, or adjust stock
              from this screen.
            </p>
            <p>
              Shopify setup: {data.configured ? "configured" : "not configured"}
              . Location:{" "}
              {data.connection?.enabled ? "connected" : "not connected"}.
            </p>
          </section>
          {data.canConfigure ? (
            <section aria-label="Shopify setup">
              <h2>Connect this location</h2>
              <p>
                Use your store’s installed Reserve connector. Never paste
                secrets here.
              </p>
              <button
                disabled={busy || !data.configured}
                onClick={() =>
                  run(async (id) => {
                    const d = await request<{ locations: Page<ShopLocation> }>(
                      `/api/shopify?location=${encodeURIComponent(id)}&setup=true`,
                    );
                    if (context.current === id) {
                      setRemoteLocations(
                        d.locations.nodes.filter((l) => l.isActive),
                      );
                    }
                    return d.locations.pageInfo.hasNextPage
                      ? "First 100 Shopify locations shown; select by the verified ID through the commissioning process for larger stores."
                      : "Shopify locations verified.";
                  })
                }
              >
                Verify Shopify connection
              </button>
              {remoteLocations.length ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(async (id) => {
                      await post("configure", {
                        locationId: id,
                        shopifyLocationId: remoteLocation,
                        enabled: true,
                      });
                      return "Shopify location connected. Payments and stock remain in Shopify.";
                    });
                  }}
                >
                  <label>
                    Shopify location
                    <select
                      aria-label="Shopify location"
                      required
                      value={remoteLocation}
                      onChange={(e) => setRemoteLocation(e.target.value)}
                    >
                      <option value="">
                        Select the matching physical location
                      </option>
                      {remoteLocations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button disabled={busy || !remoteLocation}>
                    Connect verified location
                  </button>
                </form>
              ) : null}
            </section>
          ) : null}
          {data.connection?.enabled ? (
            <>
              <section>
                <h2>Verified POS sales</h2>
                <p>
                  Refresh to bring in the newest 10 POS sales for this location.
                  Load more for older sales. Customer identity is linked through
                  a reviewed visit, never guessed from an email.
                </p>
                <div className="ops-actions">
                  <button
                    disabled={busy}
                    onClick={() =>
                      run(async (id) => {
                        const d = await post<{
                          hasNextPage: boolean;
                          endCursor: string | null;
                          imported: number;
                        }>("sync", { locationId: id });
                        if (context.current === id)
                          setCursor(d.hasNextPage ? d.endCursor : null);
                        return `${d.imported} verified POS sales imported.`;
                      })
                    }
                  >
                    Refresh POS sales
                  </button>
                  {cursor ? (
                    <button
                      disabled={busy}
                      onClick={() =>
                        run(async (id) => {
                          const d = await post<{
                            hasNextPage: boolean;
                            endCursor: string | null;
                            imported: number;
                          }>("sync", { locationId: id, cursor });
                          if (context.current === id)
                            setCursor(d.hasNextPage ? d.endCursor : null);
                          return `${d.imported} older POS sales imported.`;
                        })
                      }
                    >
                      Load older POS sales
                    </button>
                  ) : null}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(async (id) => {
                      const value = orderId.trim();
                      await post("import", {
                        locationId: id,
                        orderId: value.startsWith("gid://")
                          ? value
                          : `gid://shopify/Order/${value}`,
                      });
                      return "Shopify order verified and refreshed.";
                    });
                  }}
                >
                  <label>
                    Order ID from Shopify admin URL
                    <input
                      aria-label="Shopify order ID"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      required
                      pattern="[0-9]+|gid://shopify/Order/[0-9]+"
                      placeholder="Numeric ID after /orders/"
                    />
                  </label>
                  <button disabled={busy}>Verify one order</button>
                </form>
                {!data.sales.length ? (
                  <p>No verified sales imported yet.</p>
                ) : (
                  data.sales.map((s) => (
                    <article className="ops-receipt" key={s.id}>
                      <h3>
                        {s.name}
                        {s.test ? " · TEST" : null}
                      </h3>
                      <p>
                        {s.financial_status.replaceAll("_", " ").toLowerCase()}
                        {s.cancelled ? " · cancelled" : null} · received{" "}
                        {money(s.received)} · refunded {money(s.refunded)}
                      </p>
                      <p>
                        {s.appointment_id
                          ? "Linked to a visit"
                          : "Not linked to a visit"}{" "}
                        · last verified {new Date(s.synced_at).toLocaleString()}
                      </p>
                      <div className="ops-actions">
                        <Link href={`/receipt/shopify/${s.id}`}>
                          View verified sale
                        </Link>
                        <button
                          disabled={busy}
                          onClick={() => {
                            setSelected(s.id);
                            setVisit("");
                            setReason("");
                          }}
                        >
                          Review {s.name}
                        </button>
                      </div>
                    </article>
                  ))
                )}
                <p>
                  Latest 100 imported sales shown. These are order-level
                  snapshots, not a bank payout or daily cash-drawer report. Use
                  Shopify reports to close the day.
                </p>
              </section>
              {selectedSale ? (
                <section aria-label="Link sale to visit">
                  <h2>Review {selectedSale.name}</h2>
                  {selectedSale.lines.map((l) => (
                    <p key={l.id}>
                      {l.quantity} × {l.name}
                    </p>
                  ))}
                  <p>
                    Received {money(selectedSale.received)} · refunded{" "}
                    {money(selectedSale.refunded)}
                  </p>
                  <button
                    disabled={busy}
                    onClick={() =>
                      run(async (id) => {
                        await post("import", {
                          locationId: id,
                          orderId: selectedSale.shopify_order_id,
                        });
                        return "Canonical sale refreshed from Shopify.";
                      })
                    }
                  >
                    Reconcile selected sale
                  </button>
                  {!selectedSale.appointment_id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        run(async (id) => {
                          await post("link", {
                            locationId: id,
                            saleId: selectedSale.id,
                            appointmentId: visit,
                            reason,
                          });
                          return "Verified sale linked to the visit. Appointment status is unchanged.";
                        });
                      }}
                    >
                      <label>
                        Checked-in or completed visit
                        <select
                          aria-label="Visit to link"
                          required
                          value={visit}
                          onChange={(e) => setVisit(e.target.value)}
                        >
                          <option value="">Choose the matching visit</option>
                          {visits.map((v) => (
                            <option key={String(v.id)} value={String(v.id)}>
                              {String(v.client_name || "Customer")} ·{" "}
                              {String(v.service_name || "Service")} ·{" "}
                              {new Date(String(v.starts_at)).toLocaleTimeString(
                                [],
                                { hour: "numeric", minute: "2-digit" },
                              )}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Receipt review note
                        <input
                          aria-label="Receipt review note"
                          required
                          maxLength={300}
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Confirm customer, service and any retail/discount differences"
                        />
                      </label>
                      <label className="ops-check">
                        <input type="checkbox" required />I checked this receipt
                        belongs to this customer and visit.
                      </label>
                      <button
                        disabled={
                          busy ||
                          !visit ||
                          selectedSale.test ||
                          selectedSale.cancelled
                        }
                      >
                        Link verified sale
                      </button>
                    </form>
                  ) : (
                    <>
                      <p>
                        This sale is already linked. A correction revokes its
                        current customer association; it does not refund money.
                      </p>
                      {data.canCorrect ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            run(async (id) => {
                              await post("unlink", {
                                locationId: id,
                                saleId: selectedSale.id,
                                reason,
                              });
                              setReason("");
                              return "Incorrect visit association removed. Correction history is preserved.";
                            });
                          }}
                        >
                          <label>
                            Correction reason
                            <input
                              aria-label="Correction reason"
                              required
                              maxLength={300}
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                            />
                          </label>
                          <button disabled={busy || !reason}>
                            Remove incorrect visit link
                          </button>
                        </form>
                      ) : (
                        <p>Ask your location manager to review corrections.</p>
                      )}
                    </>
                  )}
                </section>
              ) : null}
              <section>
                <h2>Shopify stock</h2>
                <p>
                  Read-only quantities at this physical location. Adjust counts
                  and returns in Shopify POS.
                </p>
                <button
                  disabled={busy}
                  onClick={() =>
                    run(async (id) => {
                      const d = await request<{
                        inventory: Page<Stock>;
                        observedAt: string;
                      }>(
                        `/api/shopify?location=${encodeURIComponent(id)}&inventory=true`,
                      );
                      if (context.current === id) {
                        setStock(d.inventory.nodes);
                        setStockCursor(
                          d.inventory.pageInfo.hasNextPage
                            ? d.inventory.pageInfo.endCursor
                            : null,
                        );
                        setStockTime(d.observedAt);
                      }
                      return "Shopify stock refreshed.";
                    })
                  }
                >
                  Read Shopify stock
                </button>
                {stockTime ? (
                  <p>
                    Observed {new Date(stockTime).toLocaleString()}. Refresh
                    before relying on a count.
                  </p>
                ) : null}
                {stock.map((s) => (
                  <article className="ops-receipt" key={s.id}>
                    <h3>
                      {s.item.variant?.product.title ||
                        s.item.sku ||
                        "Inventory item"}
                    </h3>
                    <p>
                      {s.item.sku || "No SKU"} · {s.item.variant?.title}
                    </p>
                    {s.quantities.map((q) => (
                      <p key={q.name}>
                        {q.name.replaceAll("_", " ")}: {q.quantity}
                      </p>
                    ))}
                  </article>
                ))}
                {stockCursor ? (
                  <button
                    disabled={busy}
                    onClick={() =>
                      run(async (id) => {
                        const d = await request<{
                          inventory: Page<Stock>;
                          observedAt: string;
                        }>(
                          `/api/shopify?location=${encodeURIComponent(id)}&inventory=true&cursor=${encodeURIComponent(stockCursor)}`,
                        );
                        if (context.current === id) {
                          setStock(d.inventory.nodes);
                          setStockCursor(
                            d.inventory.pageInfo.hasNextPage
                              ? d.inventory.pageInfo.endCursor
                              : null,
                          );
                          setStockTime(d.observedAt);
                        }
                        return "Next stock page loaded.";
                      })
                    }
                  >
                    Next stock page
                  </button>
                ) : null}
              </section>
            </>
          ) : (
            <section>
              <h2>Before the first sale</h2>
              <ol>
                <li>Install and authorize the Reserve Shopify connector.</li>
                <li>Connect the matching Shopify and Reserve locations.</li>
                <li>
                  Set real services, Legacy Reserve products, stock and tax in
                  Shopify.
                </li>
                <li>Verify a POS sale, receipt and refund before launch.</li>
              </ol>
            </section>
          )}
          {data.events.length ? (
            <section>
              <h2>Integration recovery</h2>
              <p>
                Unmapped deliveries stay separate from this location’s revenue.
                Online orders require a separate verified mapping.
              </p>
              {data.events.map((e) => (
                <p key={String(e.event_id)}>
                  {String(e.topic)} · {String(e.state)} · attempts{" "}
                  {String(e.attempts)}
                </p>
              ))}
            </section>
          ) : null}
        </>
      )}
      <footer>
        <Link href="/studio">Location operations</Link> ·{" "}
        <Link href="/account">Your account</Link>
      </footer>
    </main>
  );
}
