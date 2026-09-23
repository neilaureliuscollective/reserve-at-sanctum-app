"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  Hammer,
  Lightbulb,
  RefreshCw,
  Sparkles,
  UsersRound,
} from "lucide-react";
import styles from "./reserve-command.module.css";

type Status = "captured" | "building" | "review" | "approved";
type Lane = "reserve" | "fix-it" | "gent";
type Kind = "idea" | "feedback" | "decision" | "task";
type Assignee = "neil" | "katie" | "both";

type Item = {
  id: string;
  kind: Kind;
  lane: Lane;
  title: string;
  detail: string;
  assignee: Assignee;
  status: Status;
  creator_name: string;
  updater_name: string;
  updated_at: string;
};

type Payload = {
  workspaceReady: boolean;
  pulse: {
    today: number;
    nextSevenDays: number;
    openBuild: number;
    needsReview: number;
    nextVisit: null | {
      starts_at: string;
      service_name?: string;
      client_name?: string;
    };
  };
  items: Item[];
};

const statusLabel: Record<Status, string> = {
  captured: "Captured",
  building: "Building",
  review: "Needs review",
  approved: "Approved",
};
const nextStatus: Record<Status, Status> = {
  captured: "building",
  building: "review",
  review: "approved",
  approved: "captured",
};
const nextAction: Record<Status, string> = {
  captured: "Start building",
  building: "Send to review",
  review: "Approve",
  approved: "Reopen",
};
const laneLabel: Record<Lane, string> = {
  reserve: "The Reserve",
  "fix-it": "Fix It Shop",
  gent: "GENT Ascend",
};

function formatVisit(value?: string) {
  if (!value) return "Nothing queued yet";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ReserveCommand({ name }: { name: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [filter, setFilter] = useState<"all" | Lane | "review">("all");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [composer, setComposer] = useState(false);

  async function refresh(silent = false) {
    if (!silent) setBusy("refresh");
    try {
      const response = await fetch("/api/studio/command", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not open Reserve Command.");
      setData(payload);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not refresh Reserve Command.");
    } finally {
      if (!silent) setBusy("");
    }
  }

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(true), 45000);
    return () => window.clearInterval(timer);
  }, []);

  const visible = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data.items;
    if (filter === "review") return data.items.filter((item) => item.status === "review");
    return data.items.filter((item) => item.lane === filter);
  }, [data, filter]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy("create");
    setMessage("");
    try {
      const response = await fetch("/api/studio/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: values.get("kind"),
          lane: values.get("lane"),
          title: values.get("title"),
          detail: values.get("detail"),
          assignee: values.get("assignee"),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not capture that.");
      form.reset();
      setComposer(false);
      setMessage("Captured in the shared Build Room.");
      await refresh(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not capture that.");
    } finally {
      setBusy("");
    }
  }

  async function advance(item: Item) {
    setBusy(item.id);
    setMessage("");
    try {
      const response = await fetch("/api/studio/command", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, status: nextStatus[item.status] }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not update that item.");
      await refresh(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update that item.");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className={styles.command} aria-labelledby="reserve-command-title">
      <div className={styles.ambient} aria-hidden="true" />
      <header className={styles.hero}>
        <div>
          <p className="eyebrow">PRIVATE OPERATOR SYSTEM</p>
          <h1 id="reserve-command-title">Reserve <em>Command.</em></h1>
          <p className={styles.intro}>
            {name.split(" ")[0]}, this is the working side of the Reserve — run the day,
            shape the brand, and keep Neil + Katie moving from the same phone-first room.
          </p>
        </div>
        <div className={styles.live}>
          <span />
          Live operator view
        </div>
      </header>

      <div className={styles.pulse}>
        <article>
          <CalendarDays size={18} />
          <strong>{data?.pulse.today ?? "—"}</strong>
          <span>Visits today</span>
        </article>
        <article>
          <Clock3 size={18} />
          <strong>{data?.pulse.nextSevenDays ?? "—"}</strong>
          <span>Next 7 days</span>
        </article>
        <article>
          <Hammer size={18} />
          <strong>{data?.pulse.openBuild ?? "—"}</strong>
          <span>In the build</span>
        </article>
        <article>
          <Eye size={18} />
          <strong>{data?.pulse.needsReview ?? "—"}</strong>
          <span>Needs review</span>
        </article>
      </div>

      <div className={styles.nextVisit}>
        <div>
          <p className="eyebrow">NEXT IN THE RESERVE</p>
          <strong>
            {data?.pulse.nextVisit?.client_name || "The chair is clear"}
          </strong>
          <span>
            {data?.pulse.nextVisit
              ? `${data.pulse.nextVisit.service_name || "Visit"} · ${formatVisit(data.pulse.nextVisit.starts_at)}`
              : "Your next confirmed visit will surface here automatically."}
          </span>
        </div>
        <Link href="#schedule" className={styles.circleAction} aria-label="Open schedule">
          <ArrowRight size={20} />
        </Link>
      </div>

      <nav className={styles.quick} aria-label="Reserve Command quick actions">
        <Link href="/" target="_blank"><Eye size={17} /> Live Reserve</Link>
        <Link href="/book"><CalendarDays size={17} /> Book</Link>
        <Link href="#availability"><Clock3 size={17} /> Availability</Link>
        <Link href="#chair-studio"><UsersRound size={17} /> The Chair</Link>
      </nav>

      <div className={styles.buildHeader}>
        <div>
          <p className="eyebrow">NEIL × KATIE · BUILD ROOM</p>
          <h2>Build it <em>together.</em></h2>
          <p>
            Ideas, feedback, decisions and work live here instead of disappearing
            into texts. Capture it in seconds, then move it forward together.
          </p>
        </div>
        <button
          className="button button-gold"
          onClick={() => setComposer((value) => !value)}
          disabled={!data?.workspaceReady}
        >
          <Sparkles size={16} />
          {composer ? "Close" : "Capture something"}
        </button>
      </div>

      {data && !data.workspaceReady && (
        <div className={styles.activation}>
          <Lightbulb size={19} />
          <div>
            <strong>Command is installed. Shared Build Room activation is next.</strong>
            <span>
              The dashboard and business pulse are safe to deploy now. The new shared
              board turns on after the included database migration is run.
            </span>
          </div>
        </div>
      )}

      {composer && data?.workspaceReady && (
        <form className={styles.composer} onSubmit={create}>
          <div className={styles.formGrid}>
            <label>
              What is it?
              <select name="kind" defaultValue="idea">
                <option value="idea">Idea</option>
                <option value="feedback">Feedback</option>
                <option value="decision">Decision</option>
                <option value="task">Task</option>
              </select>
            </label>
            <label>
              World
              <select name="lane" defaultValue="reserve">
                <option value="reserve">The Reserve</option>
                <option value="fix-it">Fix It Shop</option>
                <option value="gent">GENT Ascend</option>
              </select>
            </label>
            <label>
              Who owns it?
              <select name="assignee" defaultValue="both">
                <option value="both">Both of us</option>
                <option value="neil">Neil</option>
                <option value="katie">Katie</option>
              </select>
            </label>
          </div>
          <label>
            Headline
            <input
              name="title"
              maxLength={90}
              required
              placeholder="Ex: Katie wants the service story to feel more personal"
            />
          </label>
          <label>
            Detail
            <textarea
              name="detail"
              rows={3}
              maxLength={600}
              placeholder="What should change, why it matters, or what you want the other person to see…"
            />
          </label>
          <button className="button button-gold" disabled={busy === "create"}>
            {busy === "create" ? "Capturing…" : "Add to Build Room"}
          </button>
        </form>
      )}

      <div className={styles.filterBar}>
        {[
          ["all", "All"],
          ["review", "Review"],
          ["reserve", "Reserve"],
          ["fix-it", "Fix It"],
          ["gent", "GENT"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={filter === value ? styles.activeFilter : ""}
            onClick={() => setFilter(value as typeof filter)}
          >
            {label}
          </button>
        ))}
        <button
          className={styles.refresh}
          aria-label="Refresh Reserve Command"
          onClick={() => void refresh()}
          disabled={busy === "refresh"}
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {data?.workspaceReady && (
        <div className={styles.board}>
          {visible.length === 0 ? (
            <div className={styles.empty}>
              <CheckCircle2 size={22} />
              <strong>Nothing waiting here.</strong>
              <span>Capture the next idea or decision when it hits.</span>
            </div>
          ) : (
            visible.map((item) => (
              <article key={item.id} className={styles.item}>
                <div className={styles.itemTop}>
                  <div className={styles.tags}>
                    <span>{laneLabel[item.lane]}</span>
                    <span>{item.kind}</span>
                  </div>
                  <span className={styles.status} data-status={item.status}>
                    {statusLabel[item.status]}
                  </span>
                </div>
                <h3>{item.title}</h3>
                {item.detail && <p>{item.detail}</p>}
                <div className={styles.meta}>
                  <span>
                    {item.assignee === "both" ? "Neil + Katie" : item.assignee === "neil" ? "Neil" : "Katie"}
                  </span>
                  <span>Updated by {item.updater_name.split(" ")[0]}</span>
                </div>
                <button
                  className={styles.advance}
                  onClick={() => void advance(item)}
                  disabled={busy === item.id}
                >
                  {busy === item.id ? "Saving…" : nextAction[item.status]}
                  <ArrowRight size={16} />
                </button>
              </article>
            ))
          )}
        </div>
      )}

      {message && <p className={styles.message} role="status">{message}</p>}
    </section>
  );
}
