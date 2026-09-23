"use client";
import { useEffect, useState, type FormEvent } from "react";
type Block = { id: string; starts_at: string; ends_at: string };
const format = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
export function StudioBlocks() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  async function refresh() {
    const response = await fetch("/api/studio/blocks", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw Error(data.error || "Could not load blocked time.");
    setBlocks(data.blocks);
  }
  useEffect(() => {
    refresh()
      .catch((e) => setMessage(e.message))
      .finally(() => setLoading(false));
  }, []);
  async function mutate(method: string, data: unknown) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/studio/blocks", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(result.error || "Could not update blocked time.");
      await refresh();
      setMessage(
        method === "POST"
          ? "Time blocked. Clients cannot book this time."
          : "Block removed. This time can be booked if it is within studio hours.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void mutate("POST", {
      date: data.get("date"),
      start: data.get("start"),
      end: data.get("end"),
    });
  }
  return (
    <section aria-labelledby="blocks-title" className="studio-blocks">
      <p className="eyebrow">KATIE’S AVAILABILITY</p>
      <h2 id="blocks-title">Make room for your day.</h2>
      <p>
        Block lunch, time away, or a break. All times are Louisiana time.
        Existing visits stay protected.
      </p>
      <form onSubmit={submit}>
        <fieldset disabled={busy || loading} className="block-fields">
          <legend>Block time · 15-minute steps</legend>
          <label>
            Date
            <input name="date" type="date" required />
          </label>
          <label>
            From
            <input name="start" type="time" step="900" required />
          </label>
          <label>
            Until
            <input name="end" type="time" step="900" required />
          </label>
          <button className="button button-gold" type="submit">
            {busy ? "Saving…" : "Block time"}
          </button>
        </fieldset>
      </form>
      <p role="status" aria-live="polite">
        {message}
      </p>
      {loading ? (
        <p>Loading blocked time…</p>
      ) : (
        <>
          <button
            className="text-link"
            disabled={busy}
            onClick={() => {
              setMessage("");
              void refresh().catch((e) => setMessage(e.message));
            }}
          >
            Refresh blocked time
          </button>
          {blocks.length === 0 ? (
            <p>No upcoming blocked time.</p>
          ) : (
            <ul className="block-list">
              {blocks.map((block) => (
                <li key={block.id}>
                  <span>
                    {format(block.starts_at)} – {format(block.ends_at)}
                  </span>
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => void mutate("DELETE", { id: block.id })}
                    aria-label={`Remove block starting ${format(block.starts_at)}`}
                  >
                    Remove block
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
