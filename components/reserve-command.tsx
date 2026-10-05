"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, Plus, RefreshCw, X } from "lucide-react";
type Item = {
  id: string;
  kind: string;
  lane: string;
  title: string;
  detail: string;
  status: "captured" | "building" | "review" | "approved";
  revision: number;
  assignee_user_id: string | null;
  visibility: string;
  completed_at: string | null;
  updater_name: string;
  updated_at: string;
};
type Event = {
  id: string;
  item_id: string;
  actor_name: string;
  action: string;
  feedback: string;
  created_at: string;
};
type Payload = {
  items: Item[];
  events: Event[];
  people: { id: string; name: string; role: string }[];
  page: number;
  hasMore: boolean;
  canApprove: boolean;
  canRequestReview: boolean;
  canCreate: boolean;
  canEdit: boolean;
  pulse: { openBuild: number; needsReview: number };
};
const laneNames: Record<string, string> = {
  reserve: "The Reserve",
  "fix-it": "Fix It Shop",
  gent: "Gent Ascend",
};
const statusNames: Record<string, string> = {
  captured: "Captured",
  building: "In progress",
  review: "With Neil",
  approved: "Approved",
};
export function ReserveCommand({
  name,
  owner,
  initialCapture = false,
  initialReview = false,
  initialTask = false,
  initialTitle = "",
  initialDetail = "",
}: {
  name: string;
  owner: boolean;
  initialCapture?: boolean;
  initialReview?: boolean;
  initialTask?: boolean;
  initialTitle?: string;
  initialDetail?: string;
}) {
  const [data, setData] = useState<Payload | null>(null),
    [page, setPage] = useState(0),
    [filter, setFilter] = useState(initialReview ? "review" : "all"),
    [capture, setCapture] = useState(initialCapture),
    [selected, setSelected] = useState<Item | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  async function refresh(reloadSelected = false) {
    try {
      const response = await fetch(`/api/studio/command?page=${page}`, {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok)
        throw Error(body.error || "Could not load shared work.");
      setData(body);
      if (reloadSelected)
        setSelected((current) =>
          current
            ? (body.items.find((i: Item) => i.id === current.id) ?? null)
            : null,
        );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void refresh();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 45000);
    return () => clearInterval(id);
  }, [page]); // Fresh authorized records; never cached offline.
  useEffect(() => {
    if (selected && !dialog.current?.open) dialog.current?.showModal();
    else if (!selected) dialog.current?.close();
  }, [selected]);
  async function mutate(method: string, body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch("/api/studio/command", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await r.json();
      if (!r.ok) throw Error(result.error || "Could not save this work.");
      setNotice("Saved in the shared workspace.");
      setCapture(false);
      setSelected(null);
      await refresh();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      v = new FormData(form);
    const ok = await mutate("POST", {
      kind: v.get("kind"),
      lane: v.get("lane"),
      title: v.get("title"),
      detail: v.get("detail"),
      assignee: "both",
      assignee_user_id: v.get("assignee_user_id") || null,
      visibility: v.get("visibility") || "shared",
    });
    if (ok) form.reset();
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const v = new FormData(e.currentTarget);
    await mutate("PATCH", {
      id: selected.id,
      revision: selected.revision,
      title: v.get("title"),
      detail: v.get("detail"),
      ...(v.get("assignee_user_id")
        ? { assignee_user_id: v.get("assignee_user_id") }
        : {}),
    });
  }
  function act(item: Item, change: Record<string, unknown>) {
    const feedback = (
      dialog.current?.querySelector<HTMLTextAreaElement>("[name=feedback]")
        ?.value || ""
    ).trim();
    void mutate("PATCH", {
      id: item.id,
      revision: item.revision,
      ...change,
      feedback,
    });
  }
  const items =
    data?.items.filter(
      (i) =>
        filter === "all" ||
        (filter === "review" && i.status === "review") ||
        i.lane === filter,
    ) || [];
  return (
    <>
      <header className="studio-title">
        <p className="eyebrow">NEIL × KATIE · SHARED WORK</p>
        <h1>
          Build it <em>together.</em>
        </h1>
        <p>Ideas become action. Decisions stay connected to the work.</p>
      </header>
      <div className="studio-build-toolbar">
        <span>
          {data
            ? `${data.pulse.openBuild} active · ${data.pulse.needsReview} awaiting review`
            : "Loading your work…"}
        </span>
        <button
          className="button button-gold"
          disabled={!data?.canCreate}
          onClick={() => setCapture(!capture)}
        >
          <Plus size={17} />
          Capture something
        </button>
      </div>
      {capture && (
        <form className="studio-composer" onSubmit={create}>
          <div className="studio-form-grid">
            <label>
              Kind
              <select name="kind" defaultValue={initialTask ? "task" : "idea"}>
                <option value="idea">Idea</option>
                <option value="task">Task</option>
                <option value="decision">Decision</option>
                <option value="feedback">Feedback</option>
              </select>
            </label>
            <label>
              Business lane
              <select name="lane" defaultValue={owner ? "reserve" : "fix-it"}>
                {Object.entries(laneNames).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Accountable lead
              <select name="assignee_user_id">
                <option value="">Me</option>
                {data?.people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name.split(" ·")[0]}
                  </option>
                ))}
              </select>
            </label>
            {owner && (
              <label>
                Visibility
                <select name="visibility">
                  <option value="shared">Shared workspace</option>
                  <option value="owner">Owner only</option>
                </select>
              </label>
            )}
          </div>
          <label>
            What needs to happen?
            <input
              name="title"
              required
              maxLength={90}
              defaultValue={initialTitle}
            />
          </label>
          <label>
            Context
            <textarea
              name="detail"
              maxLength={6000}
              rows={4}
              defaultValue={initialDetail}
            />
          </label>
          <div className="studio-controls">
            <button className="button button-gold" disabled={busy}>
              Save work
            </button>
            <button
              type="button"
              className="text-link"
              onClick={() => setCapture(false)}
            >
              Close
            </button>
          </div>
        </form>
      )}
      <div className="studio-filters" aria-label="Filter shared work">
        {[
          ["all", "All"],
          ["review", "With Neil"],
          ["reserve", "Reserve"],
          ["fix-it", "Fix It"],
          ["gent", "Gent"],
        ].map(([v, l]) => (
          <button
            key={v}
            aria-pressed={filter === v}
            onClick={() => setFilter(v)}
          >
            {l}
          </button>
        ))}
        <button
          aria-label="Refresh work"
          disabled={busy}
          onClick={() => void refresh()}
        >
          <RefreshCw size={16} />
        </button>
      </div>
      {error && (
        <div className="studio-error" role="alert">
          {error}
          <button className="text-link" onClick={() => void refresh(true)}>
            Reload work
          </button>
        </div>
      )}
      {notice && (
        <p role="status" className="studio-notice">
          {notice}
        </p>
      )}
      <section className="studio-work-list">
        {items.map((item) => (
          <button
            className="studio-work-entry"
            key={item.id}
            onClick={() => setSelected(item)}
          >
            <div>
              <small>
                {laneNames[item.lane]} · {item.kind}
                {item.visibility === "owner" ? " · Owner only" : ""}
              </small>
              <strong>{item.title}</strong>
              <span>
                {data?.people
                  .find((p) => p.id === item.assignee_user_id)
                  ?.name.split(" ·")[0] || "Team"}{" "}
                · {item.completed_at ? "Completed" : statusNames[item.status]}
              </span>
            </div>
            <ArrowUpRight size={22} />
          </button>
        ))}
        {data && !items.length && (
          <div className="studio-section">
            <h2>
              {filter === "all"
                ? "Room for the next good idea."
                : "Nothing in this view."}
            </h2>
            <p>
              {filter === "all"
                ? "Capture work in seconds, give it a lead, and move it forward together."
                : "Filters apply to this page of work."}
            </p>
          </div>
        )}
      </section>
      <div className="studio-pagination">
        <button
          className="text-link"
          disabled={page === 0}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>
        <span>Page {page + 1}</span>
        <button
          className="text-link"
          disabled={!data?.hasMore}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
      <dialog
        ref={dialog}
        className="studio-work-dialog"
        onCancel={() => setSelected(null)}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <>
            <div className="studio-dialog-head">
              <span>
                {laneNames[selected.lane]} · {selected.kind} · Revision{" "}
                {selected.revision}
              </span>
              <button aria-label="Close work" onClick={() => setSelected(null)}>
                <X />
              </button>
            </div>
            <form key={`${selected.id}:${selected.revision}`} onSubmit={save}>
              <label>
                Work
                <input
                  name="title"
                  required
                  defaultValue={selected.title}
                  maxLength={90}
                  readOnly={!data?.canEdit}
                />
              </label>
              <label>
                Context
                <textarea
                  name="detail"
                  rows={6}
                  defaultValue={selected.detail}
                  maxLength={6000}
                  readOnly={!data?.canEdit}
                />
              </label>
              {data?.canEdit && (
                <label>
                  Accountable lead
                  <select
                    name="assignee_user_id"
                    defaultValue={selected.assignee_user_id ?? ""}
                  >
                    <option value="">Keep current lead</option>
                    {data?.people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name.split(" ·")[0]}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <p className="studio-muted">
                {selected.completed_at
                  ? "Completed"
                  : statusNames[selected.status]}{" "}
                ·{" "}
                {selected.visibility === "owner"
                  ? "Owner-only work"
                  : "Shared business work"}
              </p>
              {data?.canEdit && (
                <button className="button button-gold" disabled={busy}>
                  Save changes
                </button>
              )}
            </form>
            {error && (
              <div role="alert" className="studio-error">
                {error}
                <button
                  className="text-link"
                  onClick={() => void refresh(true)}
                >
                  Reload latest (replaces your draft)
                </button>
              </div>
            )}
            <label>
              Review feedback (optional)
              <textarea name="feedback" rows={2} maxLength={600} />
            </label>
            <div className="studio-controls">
              {data?.canEdit &&
                !selected.completed_at &&
                selected.status === "captured" && (
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => act(selected, { status: "building" })}
                  >
                    Start work
                  </button>
                )}
              {data?.canEdit &&
                data.canRequestReview &&
                !selected.completed_at &&
                ["captured", "building"].includes(selected.status) && (
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => act(selected, { status: "review" })}
                  >
                    Send to Neil
                  </button>
                )}
              {data?.canApprove &&
                selected.status === "review" &&
                !selected.completed_at && (
                  <>
                    <button
                      className="button button-gold"
                      disabled={busy}
                      onClick={() => act(selected, { status: "approved" })}
                    >
                      Approve this revision
                    </button>
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() =>
                        act(selected, { action: "request_changes" })
                      }
                    >
                      Request changes
                    </button>
                  </>
                )}
              {data?.canEdit &&
                !selected.completed_at &&
                (owner ||
                  (selected.kind === "task" &&
                    selected.status !== "review")) && (
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => act(selected, { action: "complete" })}
                  >
                    Mark complete
                  </button>
                )}
              {data?.canEdit && selected.completed_at && (
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => act(selected, { status: "captured" })}
                >
                  Reopen
                </button>
              )}
              {owner && (
                <button
                  className="text-link"
                  disabled={busy}
                  onClick={() => act(selected, { action: "archive" })}
                >
                  Archive
                </button>
              )}
            </div>
            <p className="studio-muted">
              Approval records a business decision. It does not publish, send
              messages, or spend money. Editing approved work sends it back to
              review.
            </p>
            <section className="studio-dialog-history">
              <p className="eyebrow">ACTIVITY</p>
              {data?.events
                .filter((e) => e.item_id === selected.id)
                .map((e) => (
                  <div className="studio-event" key={e.id}>
                    <span>
                      {e.actor_name.split(" ·")[0]} ·{" "}
                      {e.action.replaceAll("_", " ")}
                    </span>
                    <small>
                      {new Intl.DateTimeFormat("en-US", {
                        timeZone: "America/Chicago",
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(e.created_at))}
                    </small>
                    {e.feedback && <p>{e.feedback}</p>}
                  </div>
                ))}
            </section>
          </>
        )}
      </dialog>
    </>
  );
}
