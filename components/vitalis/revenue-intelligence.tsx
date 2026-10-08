"use client";
import { useState } from "react";
import {
  forecast,
  forecastSchema,
  preset,
  scenarioKeys,
  tierNames,
  tierEconomics,
  productEconomics,
  scaleEconomics,
  exportCsv,
  type Forecast,
  type ScenarioKey,
} from "@/lib/vitalis/economics";
import type { revenueOverview } from "@/lib/vitalis/revenue-store";
type Snapshot = Awaited<ReturnType<typeof revenueOverview>>;
const usd = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
const decimal = (n: number) => n.toFixed(1);
const labels: Record<ScenarioKey, string> = {
  conservative: "Conservative",
  base: "Base case",
  strong: "Strong launch",
};
const globalFields: [keyof Forecast, string, boolean?][] = [
  ["cacStart", "Starting acquisition cost"],
  ["cacEnd", "Final acquisition cost"],
  ["upgradeEssential", "Essential → Optimize", true],
  ["upgradeOptimize", "Optimize → Sovereign", true],
  ["downgradeOptimize", "Optimize → Essential", true],
  ["downgradeSovereign", "Sovereign → Optimize", true],
  ["productAttach", "Monthly product order rate", true],
  ["productPrice", "Product basket list price"],
  ["productCost", "Product basket landed cost"],
  ["productFulfillment", "Per-order shipping and fulfillment"],
  ["productRefund", "Product refund rate", true],
  ["processingRate", "Processing rate", true],
  ["processingFixed", "Processing fee per charge"],
  ["membershipRefund", "Membership refund rate", true],
  [
    "partnerTreatmentAttach",
    "Partner-billed treatment rate (Optimize / Sovereign)",
    true,
  ],
  ["partnerTreatmentPrice", "Partner-billed monthly treatment price"],
  ["fixed", "Monthly fixed overhead"],
  ["platform", "Monthly platform expenses"],
  ["capacityStep", "Members per support capacity step"],
  ["capacityCost", "Monthly added cost per capacity step"],
  ["startup", "One-time startup cash"],
  ["inventoryDeposit", "Initial inventory cash reserve"],
];
const tierFields: [keyof Forecast["tiers"][number], string, boolean?][] = [
  ["price", "Monthly price"],
  ["mix", "New-member mix", true],
  ["churn", "Monthly churn", true],
  ["digital", "Digital servicing per month"],
  ["support", "Support per month"],
  ["clinical", "Clinical allowance per month"],
  ["labs", "Lab allowance per month"],
  ["onboarding", "Initial clinical onboarding"],
  ["medication", "Medication + shipping per eligible month"],
  ["medicationEligibility", "Medication inclusion eligible share", true],
  ["discount", "Product discount", true],
  ["quarterlyBox", "Quarterly box landed + shipping cost"],
];
function download(name: string, body: string, type: string) {
  const u = URL.createObjectURL(new Blob([body], { type })),
    a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
function NumberField({
  label,
  value,
  percent = false,
  onChange,
}: {
  label: string;
  value: number;
  percent?: boolean;
  onChange: (n: number) => void;
}) {
  return (
    <label className="vitalis-field">
      {label}
      {percent ? " (%)" : ""}
      <input
        type="number"
        step="any"
        min="0"
        max={percent ? 100 : 100000}
        value={Number((value * (percent ? 100 : 1)).toFixed(6))}
        onChange={(e) => onChange(Number(e.target.value) / (percent ? 100 : 1))}
      />
    </label>
  );
}
export function RevenueIntelligence({ initial }: { initial: Snapshot }) {
  const [records, setRecords] = useState(initial.scenarios),
    [key, setKey] = useState<ScenarioKey>("base"),
    [dirty, setDirty] = useState<Partial<Record<ScenarioKey, boolean>>>({}),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const selected = records.find((r) => r.key === key)!,
    s = selected.assumptions,
    validation = forecastSchema.safeParse(s),
    result = validation.success ? forecast(s) : null;
  function edit(fn: (x: Forecast) => Forecast) {
    setRecords((rows) =>
      rows.map((r) =>
        r.key === key ? { ...r, assumptions: fn(r.assumptions) } : r,
      ),
    );
    setDirty((x) => ({ ...x, [key]: true }));
    setMessage("");
  }
  async function save() {
    if (!validation.success) return;
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/studio/vitalis/revenue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          revision: selected.revision,
          assumptions: s,
        }),
        signal: AbortSignal.timeout(10000),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setRecords((rows) =>
        rows.map((row) =>
          row.key === key
            ? {
                ...row,
                revision: d.revision,
                updatedAt: new Date().toISOString(),
              }
            : row,
        ),
      );
      setDirty((x) => ({ ...x, [key]: false }));
      setMessage(
        "Planning scenario saved. No prices, benefits or billing settings changed.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  async function refresh() {
    setBusy(true);
    try {
      const r = await fetch("/api/studio/vitalis/revenue", {
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) throw Error("Unable to refresh saved scenarios.");
      const d: Snapshot = await r.json();
      setRecords(d.scenarios);
      setDirty({});
      setMessage("Saved scenarios restored. Unsaved edits were discarded.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to refresh.");
    } finally {
      setBusy(false);
    }
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 16000)
        throw Error("Use a planning JSON file smaller than 16 KB.");
      const data = forecastSchema.parse(JSON.parse(await file.text()));
      edit(() => data);
      setMessage("Assumptions imported as an unsaved planning draft.");
    } catch {
      setMessage(
        "Import rejected. Use a valid Vitalis assumptions JSON file; your current draft has not changed.",
      );
    }
  }
  const last = result?.rows[11];
  return (
    <>
      <section className="revenue-actuals studio-panel">
        <p className="experience-kicker">ACTUAL RECORDS · TODAY</p>
        <h2>Demand is real. Revenue is not connected.</h2>
        <dl className="member-details">
          <div>
            <dt>Vitalis early-access registrations</dt>
            <dd>{String(initial.actuals.demand.registrations)}</dd>
          </div>
          <div>
            <dt>Separate email permissions</dt>
            <dd>{String(initial.actuals.demand.email_permission)}</dd>
          </div>
          <div>
            <dt>Paid Vitalis members / revenue</dt>
            <dd>Unavailable · billing ledger unconnected</dd>
          </div>
          <div>
            <dt>Existing active membership records</dt>
            <dd>
              {initial.actuals.existingMemberships
                .map((m) => `${m.count} ${m.access_basis}`)
                .join(" · ") || "0 recorded"}
            </dd>
          </div>
        </dl>
        <p>
          Existing membership records are separate from Vitalis paid membership.
          No patient information, treatment history or transaction identities
          are loaded here.
        </p>
      </section>
      <section className="revenue-planning">
        <p className="experience-kicker">HYPOTHETICAL · YEAR ONE · USD</p>
        <h2>Build the economics before the promise.</h2>
        <p>
          All costs, tier mix, signups and churn below are editable planning
          hypotheses. They are not partner quotes, approved prices or business
          results.
        </p>
        <div
          className="revenue-tabs"
          role="group"
          aria-label="Financial scenarios"
        >
          {scenarioKeys.map((k) => (
            <button
              key={k}
              disabled={busy}
              className={
                k === key ? "button button-gold" : "button button-outline"
              }
              aria-pressed={k === key}
              onClick={() => {
                setKey(k);
                setMessage("");
              }}
            >
              {labels[k]}
            </button>
          ))}
        </div>
        <p className="revenue-caption">
          {dirty[key]
            ? "Unsaved draft"
            : selected.revision
              ? `Saved revision ${selected.revision}`
              : "Research preset · not yet saved"}{" "}
          · No effect on public pricing or enrollment.
        </p>
        {!validation.success && (
          <p role="alert" className="vitalis-note">
            Calculation paused: {validation.error.issues[0].message} Correct the
            inputs before saving or exporting.
          </p>
        )}
        {result && last && (
          <>
            <div className="revenue-metrics">
              <article>
                <span>Month 12 members</span>
                <strong>{decimal(last.active)}</strong>
                <small>Expected cohort count; not actual people</small>
              </article>
              <article>
                <span>Month 12 MRR</span>
                <strong>{usd(last.mrr)}</strong>
                <small>ARR {usd(last.arr)} · Membership only</small>
              </article>
              <article>
                <span>Year-one operating income</span>
                <strong>{usd(result.year.operating)}</strong>
                <small>Before tax, financing and startup cash</small>
              </article>
              <article>
                <span>Minimum launch funding</span>
                <strong>{usd(result.capital)}</strong>
                <small>Peak cash deficit; add a contingency buffer</small>
              </article>
            </div>
            <div className="revenue-plot">
              <h3>Twelve months of the business.</h3>
              <p>
                Gold: net revenue · Champagne: operating income · Dashed: zero
              </p>
              <Trend rows={result.rows} />
              <p>
                First nonnegative operating month:{" "}
                {result.firstOperating ?? "None"} · Sustained through Month 12:{" "}
                {result.sustainedOperating ?? "None"} · Startup cash recovery:{" "}
                {result.cashRecovery ?? "Not within year one"}
              </p>
            </div>
            <div
              className="revenue-table"
              tabIndex={0}
              role="region"
              aria-label="Monthly financial projection"
            >
              <table>
                <caption>
                  {labels[key]} · Full-month billing and service delivery on
                  closing members
                </caption>
                <thead>
                  <tr>
                    {[
                      "Month",
                      "Opening",
                      "New",
                      "Cancel",
                      "Upgrade",
                      "Downgrade",
                      "Active",
                      "MRR",
                      "Net revenue",
                      "Delivery costs",
                      "Fees",
                      "Acquisition",
                      "Overhead",
                      "Operating income",
                      "Cash flow",
                      "Cumulative cash",
                    ].map((x) => (
                      <th key={x}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r) => (
                    <tr key={r.month}>
                      <th>{r.month}</th>
                      {[
                        r.opening,
                        r.joins,
                        r.churned,
                        r.upgrades,
                        r.downgrades,
                        r.active,
                      ].map((x, i) => (
                        <td key={i}>{decimal(x)}</td>
                      ))}
                      {[
                        r.mrr,
                        r.netRevenue,
                        r.delivery,
                        r.fees,
                        r.acquisition,
                        r.overhead,
                        r.operating,
                        r.cashFlow,
                        r.cumulative,
                      ].map((x, i) => (
                        <td key={i}>{usd(x)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              Year-one net revenue {usd(result.year.netRevenue)} · Refunds{" "}
              {usd(result.year.refunds)} · Processing {usd(result.year.fees)} ·
              Acquisition {usd(result.year.acquisition)} · Cash after startup
              and inventory reserve {usd(result.year.cashFlow)}.
            </p>
            <p>
              Partner-billed treatment gross {usd(result.year.partnerGross)} is
              shown only for context and excluded from Legacy Reserve revenue,
              MRR, ARR, fees and profit. No referral income is assumed.
            </p>
            <section className="revenue-unit">
              <h3>Every tier must earn its place.</h3>
              <div className="revenue-unit-grid">
                {s.tiers.map((t, i) => {
                  const e = tierEconomics(s, i),
                    p = productEconomics(s, i);
                  return (
                    <article key={i}>
                      <p className="experience-kicker">
                        {tierNames[i]} · HYPOTHETICAL
                      </p>
                      <strong>{usd(e.contribution)} /member/month</strong>
                      <p>
                        Recurring contribution before acquisition, initial
                        onboarding and fixed overhead.
                      </p>
                      <dl>
                        <dt>Service delivery incl. medication</dt>
                        <dd>{usd(e.service)}</dd>
                        <dt>Box reserve / month</dt>
                        <dd>{usd(e.box)}</dd>
                        <dt>Product contribution / member</dt>
                        <dd>{usd(e.productContribution)}</dd>
                        <dt>Contribution LTV / CAC</dt>
                        <dd>
                          {e.ltvCac === null
                            ? "Undefined"
                            : `${e.ltvCac.toFixed(1)}×`}
                        </dd>
                        <dt>CAC payback</dt>
                        <dd>
                          {e.payback === null
                            ? "No positive contribution"
                            : `${e.payback.toFixed(1)} months`}
                        </dd>
                        <dt>
                          Medication headroom before zero recurring contribution
                        </dt>
                        <dd>{usd(e.headroom)} /member/month</dd>
                      </dl>
                      <p>
                        {p.allowed
                          ? `Eligible modeled order margin: ${usd(p.margin)}.`
                          : "Product orders excluded: proposed discount creates a loss."}
                      </p>
                    </article>
                  );
                })}
              </div>
              <p>
                LTV is recurring contribution divided by monthly churn, less
                initial onboarding. It is a constant-tier estimate before fixed
                overhead, with no upgrade or downgrade credit. Zero churn makes
                LTV undefined. Medication headroom is a break-even ceiling, not
                a safe budget or a treatment quote.
              </p>
            </section>
            <section>
              <h3>What 100, 300 and 500 members mean.</h3>
              <p>
                Steady scale at the selected new-member mix. Replacement
                acquisition maintains membership after churn; no growth is
                assumed. Includes replacement onboarding, box accrual, capacity
                steps and modeled product margins.
              </p>
              <div
                className="revenue-table"
                tabIndex={0}
                role="region"
                aria-label="Steady membership scale"
              >
                <table>
                  <thead>
                    <tr>
                      <th>Members</th>
                      <th>Membership MRR</th>
                      <th>Recurring contribution</th>
                      <th>Replacement acquisition</th>
                      <th>Replacement onboarding</th>
                      <th>Overhead</th>
                      <th>Operating income</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[100, 300, 500].map((n) => {
                      const r = scaleEconomics(s, n);
                      return (
                        <tr key={n}>
                          <th>{n}</th>
                          {[
                            r.mrr,
                            r.contribution,
                            r.acquisition,
                            r.onboarding,
                            r.overhead,
                            r.operating,
                          ].map((x, i) => (
                            <td key={i}>{usd(x)}</td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
        <section className="revenue-controls">
          <h3>Your assumptions.</h3>
          <p>
            Edit the inputs to recalculate immediately. Mix must total 100%.
            Churn and tier movements apply to opening members; new members are
            billed for a full month. Quarterly boxes accrue monthly and are paid
            in months 3, 6, 9 and 12 for that month's Sovereign cohort.
          </p>
          <fieldset disabled={busy}>
            <legend>New members each month</legend>
            <div className="revenue-signups">
              {s.signups.map((n, i) => (
                <NumberField
                  key={i}
                  label={`Month ${i + 1} signups`}
                  value={n}
                  onChange={(n) =>
                    edit((x) => ({
                      ...x,
                      signups: x.signups.map((v, j) => (j === i ? n : v)),
                    }))
                  }
                />
              ))}
            </div>
          </fieldset>
          <details>
            <summary>
              Tier prices, mix, servicing and medication inclusion
            </summary>
            <div className="revenue-tier-controls">
              {s.tiers.map((t, i) => (
                <fieldset key={i} disabled={busy}>
                  <legend>Vitalis {tierNames[i]}</legend>
                  {tierFields.map(([field, label, percent]) => (
                    <NumberField
                      key={field}
                      label={`${tierNames[i]} ${label}`}
                      percent={percent}
                      value={Number(t[field])}
                      onChange={(n) =>
                        edit((x) => ({
                          ...x,
                          tiers: x.tiers.map((v, j) =>
                            j === i ? { ...v, [field]: n } : v,
                          ),
                        }))
                      }
                    />
                  ))}
                  <label className="vitalis-check">
                    <input
                      type="checkbox"
                      checked={t.medicationIncluded}
                      onChange={(e) =>
                        edit((x) => ({
                          ...x,
                          tiers: x.tiers.map((v, j) =>
                            j === i
                              ? { ...v, medicationIncluded: e.target.checked }
                              : v,
                          ),
                        }))
                      }
                    />
                    {tierNames[i]} model medication inclusion
                  </label>
                  <p>
                    Simulation only. Eligibility share is an aggregate
                    assumption, never a clinical eligibility decision.
                  </p>
                </fieldset>
              ))}
            </div>
          </details>
          <details>
            <summary>
              Acquisition, transitions, products, processing and operating costs
            </summary>
            <fieldset disabled={busy}>
              <legend>Business drivers</legend>
              <div className="revenue-driver-grid">
                {globalFields.map(([field, label, percent]) => (
                  <NumberField
                    key={field}
                    label={label}
                    percent={percent}
                    value={Number(s[field])}
                    onChange={(n) => edit((x) => ({ ...x, [field]: n }))}
                  />
                ))}
              </div>
            </fieldset>
          </details>
          <div className="member-actions">
            <button
              disabled={busy || !validation.success}
              onClick={() => void save()}
              className="button button-gold"
            >
              {busy ? "Working…" : "Save planning scenario"}
            </button>
            <button
              disabled={busy}
              className="button button-outline"
              onClick={() => edit(() => preset(key))}
            >
              Reset selected draft to research preset
            </button>
            <button
              disabled={busy}
              className="button button-outline"
              onClick={() => void refresh()}
            >
              Discard edits and refresh saved scenarios
            </button>
          </div>
          <div className="member-actions">
            <button
              disabled={!validation.success || busy}
              onClick={() =>
                download(
                  `vitalis-${key}-assumptions.json`,
                  JSON.stringify(s, null, 2),
                  "application/json",
                )
              }
              className="text-link"
            >
              Download editable assumptions
            </button>
            <button
              disabled={!validation.success || busy}
              onClick={() =>
                download(
                  `vitalis-${key}-forecast.csv`,
                  exportCsv(s),
                  "text/csv",
                )
              }
              className="text-link"
            >
              Download monthly forecast CSV
            </button>
            <label className="vitalis-field">
              Import assumptions for selected scenario
              <input
                type="file"
                accept="application/json,.json"
                disabled={busy}
                onChange={(e) => void importFile(e.target.files?.[0])}
              />
            </label>
          </div>
          <p role="status" aria-live="polite">
            {message}
          </p>
        </section>
        <section>
          <h3>Compare the three drafts.</h3>
          <div
            className="revenue-table"
            tabIndex={0}
            role="region"
            aria-label="Scenario comparison"
          >
            <table>
              <thead>
                <tr>
                  <th>Scenario</th>
                  <th>Month 12 active</th>
                  <th>Month 12 MRR</th>
                  <th>Year net revenue</th>
                  <th>Year operating income</th>
                  <th>Minimum funding</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const valid = forecastSchema.safeParse(r.assumptions);
                  if (!valid.success)
                    return (
                      <tr key={r.key}>
                        <th>{labels[r.key]}</th>
                        <td colSpan={5}>Correct invalid draft inputs</td>
                      </tr>
                    );
                  const f = forecast(r.assumptions);
                  return (
                    <tr key={r.key}>
                      <th>
                        {labels[r.key]}
                        {dirty[r.key] ? " · unsaved" : ""}
                      </th>
                      <td>{decimal(f.rows[11].active)}</td>
                      {[
                        f.rows[11].mrr,
                        f.year.netRevenue,
                        f.year.operating,
                        f.capital,
                      ].map((v, i) => (
                        <td key={i}>{usd(v)}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <section className="vitalis-note">
          <h3>Before these plans can be sold.</h3>
          <p>
            Verify Connect Scripts provider entity, program and state coverage,
            medication formulary and landed pricing, clinical visit cadence, lab
            fees, fulfillment, platform minimums, refunds, billing ownership,
            API and webhook contract, privacy agreements and support service
            levels. Square membership charges and product discounts remain
            disabled.
          </p>
          <p>
            Fixed overhead must cover the founder's intended compensation and
            operating obligations. This model excludes taxes, financing costs,
            payment-settlement delays and inventory lead-time changes. Add a
            cash buffer beyond the minimum shown. Capacity costs are editable,
            not a staffing commitment.
          </p>
        </section>
      </section>
    </>
  );
}
function Trend({ rows }: { rows: ReturnType<typeof forecast>["rows"] }) {
  const values = rows.flatMap((r) => [r.netRevenue, r.operating, 0]),
    lo = Math.min(...values),
    hi = Math.max(...values, 1),
    x = (i: number) => 30 + i * 60,
    y = (v: number) => 200 - ((v - lo) / (hi - lo)) * 175;
  const path = (k: "netRevenue" | "operating") =>
    rows.map((r, i) => `${i ? "L" : "M"}${x(i)},${y(r[k])}`).join(" ");
  return (
    <svg
      viewBox="0 0 720 230"
      role="img"
      aria-label="Projected monthly net revenue and operating income; exact values in the monthly table"
    >
      <line
        x1="30"
        x2="690"
        y1={y(0)}
        y2={y(0)}
        stroke="#a5a99f"
        strokeDasharray="5 5"
      />
      <path
        d={path("netRevenue")}
        fill="none"
        stroke="#C4912F"
        strokeWidth="3"
      />
      <path
        d={path("operating")}
        fill="none"
        stroke="#E0BB6A"
        strokeWidth="3"
      />
      {rows.map((r, i) => (
        <text
          key={i}
          x={x(i)}
          y="223"
          textAnchor="middle"
          fill="#c8cebf"
          fontSize="12"
        >
          {r.month}
        </text>
      ))}
      <text x="30" y="15" fill="#c8cebf" fontSize="12">
        {usd(hi)}
      </text>
      <text x="30" y="199" fill="#c8cebf" fontSize="12">
        {usd(lo)}
      </text>
    </svg>
  );
}
