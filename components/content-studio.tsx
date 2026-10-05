"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type {
  WorkspaceItem,
  WorkspaceLane,
  commandCenter,
} from "@/lib/command-center";
import { useStudioAssistant } from "./studio-assistant";
type Data = Awaited<ReturnType<typeof commandCenter>>;
export function ContentStudio({
  data: initial,
  selected,
}: {
  data: Data;
  selected: WorkspaceItem | null;
}) {
  const [data, setData] = useState(initial),
    [item, setItem] = useState(selected);
  const [title, setTitle] = useState(selected?.title || ""),
    [copy, setCopy] = useState(selected?.detail || "");
  const [lane, setLane] = useState<WorkspaceLane>(selected?.lane || "reserve");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const ask = useStudioAssistant();
  const dirty =
    title !== (item?.title || "") ||
    copy !== (item?.detail || "") ||
    lane !== (item?.lane || "reserve");
  useEffect(() => {
    if (!dirty) return;
    const leave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    const followLink = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest("a[href]");
      if (
        link &&
        !window.confirm(
          "Leave this unsaved draft? Save it first to keep your changes.",
        )
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", leave);
    document.addEventListener("click", followLink, true);
    return () => {
      window.removeEventListener("beforeunload", leave);
      document.removeEventListener("click", followLink, true);
    };
  }, [dirty]);
  const canLeave = () =>
    !dirty ||
    window.confirm(
      "Leave this unsaved draft? Save it first to keep your changes.",
    );
  async function save(review = false) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      let saved = item;
      if (dirty || !saved) {
        const response = await fetch("/api/studio/command", {
          method: saved ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            saved
              ? { id: saved.id, revision: saved.revision, title, detail: copy }
              : {
                  kind: "content",
                  title,
                  detail: copy,
                  lane,
                  assignee: "both",
                  visibility: "shared",
                },
          ),
        });
        const result = await response.json();
        if (!response.ok) throw Error(result.error || "Could not save draft.");
        saved = result.item;
        setItem(saved);
        setTitle(saved!.title);
        setCopy(saved!.detail);
      }
      if (review && saved) {
        const response = await fetch("/api/studio/command", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: saved.id,
            revision: saved.revision,
            status: "review",
          }),
        });
        const result = await response.json();
        if (!response.ok)
          throw Error(result.error || "Could not request review.");
        saved = result.item;
        setItem(saved);
      }
      if (saved)
        setData((old) => ({
          ...old,
          items: [saved!, ...old.items.filter((i) => i.id !== saved!.id)],
        }));
      setNotice(review ? "Saved and sent to Neil for review." : "Draft saved.");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not save. Your text remains here.",
      );
    } finally {
      setBusy(false);
    }
  }
  function select(next: WorkspaceItem | null) {
    if (!canLeave()) return;
    setItem(next);
    setTitle(next?.title || "");
    setCopy(next?.detail || "");
    setLane(next?.lane || "reserve");
    setError("");
    setNotice("");
  }
  async function nextPage() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/studio/command?kind=content&page=${data.page + 1}`,
      );
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      setData((old) => ({ ...result, items: [...old.items, ...result.items] }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load drafts.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="content-world">
      <header className="content-heading">
        <div>
          <p className="eyebrow">CONTENT STUDIO</p>
          <h1>
            Make it <em>matter.</em>
          </h1>
        </div>
        <Link className="studio-inline" href="/studio">
          ← Command
        </Link>
      </header>
      <div className="content-workspace">
        <aside className="content-library" aria-label="Saved drafts">
          <button
            className="button button-outline"
            disabled={busy}
            onClick={() => select(null)}
          >
            New draft
          </button>
          {data.items.map((d) => (
            <button
              key={d.id}
              disabled={busy}
              aria-pressed={item?.id === d.id}
              onClick={() => select(d)}
            >
              <strong>{d.title}</strong>
              <small>
                {d.lane} · {d.status}
              </small>
            </button>
          ))}
          {!data.items.length ? (
            <p>No drafts yet. Start with something worth saying.</p>
          ) : null}
          {data.hasMore ? (
            <button disabled={busy} onClick={nextPage}>
              More drafts
            </button>
          ) : null}
        </aside>
        <section className="content-editor" aria-label="Writing workspace">
          <div className="content-toolbar">
            <label>
              Brand lane
              <select
                aria-label="Brand lane"
                disabled={busy || !!item}
                value={lane}
                onChange={(e) => setLane(e.target.value as WorkspaceLane)}
              >
                <option value="reserve">The Reserve</option>
                <option value="fix-it">Fix It Shop</option>
                <option value="gent">Gent Ascend Collective</option>
              </select>
            </label>
            <span>
              {item
                ? `${item.status} · revision ${item.revision}`
                : "New draft"}
              {dirty ? " · Unsaved" : ""}
            </span>
          </div>
          <label className="content-title-label">
            Draft title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={busy || (!data.canEdit && !!item)}
              maxLength={90}
              placeholder="Give the work a name"
            />
          </label>
          <label className="content-copy-label">
            Your copy
            <textarea
              value={copy}
              onChange={(e) => setCopy(e.target.value)}
              disabled={busy || (!data.canEdit && !!item)}
              maxLength={6000}
              placeholder="Start with the message. A post, a product story, a launch invitation…"
            />
          </label>
          <div className="content-word-count">
            {copy.trim() ? copy.trim().split(/\s+/).length : 0} words ·{" "}
            {copy.length}/6000
          </div>
          {error ? (
            <p className="studio-error" role="alert">
              {error} Your text is still in this editor.
            </p>
          ) : null}
          <p className="studio-notice" role="status">
            {notice}
          </p>
          <div className="studio-controls">
            <button
              className="button button-gold"
              disabled={
                busy ||
                !title.trim() ||
                (item ? !data.canEdit : !data.canCreate)
              }
              onClick={() => save()}
            >
              Save draft
            </button>
            <button
              className="button button-outline"
              disabled={
                busy ||
                !title.trim() ||
                !copy.trim() ||
                !data.canRequestReview ||
                (item ? !data.canEdit : !data.canCreate)
              }
              onClick={() => save(true)}
            >
              Send to Neil
            </button>
            <button
              className="button button-outline"
              disabled={busy || (item ? !data.canEdit : !data.canCreate)}
              onClick={() =>
                ask({
                  draft: copy,
                  lane,
                  onUse: (answer) => {
                    setCopy(answer);
                    setNotice("Suggestion added. Review and save your draft.");
                  },
                })
              }
            >
              Shape with Aethelios
            </button>
          </div>
          {item?.status === "review" ? (
            <Link className="studio-inline" href="/studio/build?view=review">
              Open owner review ↗
            </Link>
          ) : null}
          <p className="studio-muted">
            Shared with your authorized team when saved. Neil approves the saved
            revision in Build Room.
          </p>
        </section>
      </div>
    </div>
  );
}
