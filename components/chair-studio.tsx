"use client";
import { useEffect, useState } from "react";
import { ChairSummary } from "./chair-summary";
import type { ChairCard } from "@/lib/chair";
export function ChairStudio() {
  const [chairs, setChairs] = useState<ChairCard[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [active, setActive] = useState<string | null>(null),
    [query, setQuery] = useState(""),
    [message, setMessage] = useState("");
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/chair/studio", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setChairs(d.chairs);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  return (
    <section
      id="chair-studio"
      className="chair-studio"
      aria-labelledby="chair-studio-heading"
    >
      <header>
        <div>
          <p className="eyebrow">KATIE’S STUDIO</p>
          <h2 id="chair-studio-heading">
            Today’s <em>Chair.</em>
          </h2>
          <p>
            Client-selected context. Read it, then meet the man where he is
            today.
          </p>
        </div>
        <button className="text-link" onClick={refresh} disabled={loading}>
          Refresh check-ins
        </button>
      </header>
      <label className="chair-field">
        Find a client
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Client name"
        />
      </label>
      {loading ? (
        <p role="status">Opening shared check-ins…</p>
      ) : chairs.length === 0 ? (
        <p className="chair-empty">
          No shared check-ins yet. Clients appear here only after choosing to
          share with Katie.
        </p>
      ) : (
        <div className="chair-studio-list">
          {chairs
            .filter((c) =>
              c.client_name.toLowerCase().includes(query.toLowerCase()),
            )
            .map((c) => (
              <article key={c.user_id} className="chair-client">
                <div className="chair-client-top">
                  <div>
                    <h3>{c.client_name}</h3>
                    <p>
                      {c.conversation} · {c.goal}
                    </p>
                    <span className="chair-small">
                      Last saved{" "}
                      {new Date(c.updated_at).toLocaleString("en-US", {
                        timeZone: "America/Chicago",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}{" "}
                      · Central
                    </span>
                  </div>
                  <button
                    className="button button-outline"
                    aria-expanded={active === c.user_id}
                    onClick={() =>
                      setActive(active === c.user_id ? null : c.user_id)
                    }
                  >
                    {active === c.user_id ? "Close Chair" : "Start Chair"}
                  </button>
                </div>
                {active === c.user_id && (
                  <div className="chair-client-detail">
                    <ChairSummary value={c} />
                    {c.life_expires_at && (
                      <p className="chair-small">
                        Life context was voluntarily shared. Available until{" "}
                        {new Date(c.life_expires_at).toLocaleDateString(
                          "en-US",
                          { timeZone: "America/Chicago" },
                        )}
                        . Ask how today feels; don’t assume.
                      </p>
                    )}
                    <ChairNote
                      key={`${c.user_id}:${c.note_revision}`}
                      chair={c}
                      onSaved={async () => {
                        await refresh();
                        setMessage("Service note saved.");
                      }}
                    />
                  </div>
                )}
              </article>
            ))}
          {query &&
            !chairs.some((c) =>
              c.client_name.toLowerCase().includes(query.toLowerCase()),
            ) && <p>No shared check-ins match that name.</p>}
        </div>
      )}
      {message && (
        <p role="status" className="chair-message">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <p className="chair-small">
        Latest 100 shared check-ins. Grooming notes only: cut, finish,
        maintenance, or next-visit details. Never record diagnoses, private
        disclosures, or assumptions about a client’s state of mind.
      </p>
    </section>
  );
}
function ChairNote({
  chair,
  onSaved,
}: {
  chair: ChairCard;
  onSaved: () => Promise<void>;
}) {
  const [body, setBody] = useState(chair.service_note),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage("");
        try {
          const r = await fetch("/api/chair/studio", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: chair.user_id,
              body,
              revision: chair.note_revision,
            }),
          });
          const d = await r.json();
          if (!r.ok) throw new Error(d.error);
          await onSaved();
        } catch (e) {
          setMessage((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="chair-field">
        Private service note
        <span>
          Katie and authorized owner only. This is separate from the client’s
          check-in.
        </span>
        <textarea
          disabled={busy}
          rows={3}
          maxLength={600}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Grooming details to remember for next time…"
        />
      </label>
      <button className="button button-outline" disabled={busy}>
        {busy ? "Saving…" : "Save service note"}
      </button>
      {message && <p role="alert">{message}</p>}
    </form>
  );
}
