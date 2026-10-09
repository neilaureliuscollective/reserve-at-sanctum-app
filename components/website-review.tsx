"use client";
import { useState } from "react";
import type { WebsiteDraft } from "@/lib/business-websites";
export function WebsiteReview({
  proposal,
  canPublish,
}: {
  proposal: WebsiteDraft;
  canPublish: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [done, setDone] = useState(false);
  async function review(decision: "approve" | "reject") {
    setBusy(true);
    try {
      const response = await fetch("/api/studio/websites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: proposal.id,
          baseRevision: proposal.base_revision,
          decision,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      setDone(true);
      setMessage(
        decision === "approve"
          ? "Published. Refresh the public website to see this revision."
          : "Rejected. Public content unchanged.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Review unavailable.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="panel">
      <h2>Proposal · Version {proposal.base_revision}</h2>
      <p>
        Only the owner can publish. These saved text fields and listed service
        descriptions will change. Prices, booking rules and site code stay
        unchanged.
      </p>
      <h3>Current copy</h3>
      <pre style={{ whiteSpace: "pre-wrap" }}>
        {JSON.stringify(proposal.baseline, null, 2)}
      </pre>
      <h3>Proposed copy</h3>
      <p>{proposal.content.headline}</p>
      <p>{proposal.content.about}</p>
      {proposal.service_changes.map((c) => (
        <p key={c.id}>
          {c.id}: {c.description}
        </p>
      ))}
      <button
        className="button button-gold"
        disabled={busy || done || !canPublish}
        onClick={() => void review("approve")}
      >
        Approve and publish saved proposal
      </button>{" "}
      <button
        disabled={busy || done || !canPublish}
        onClick={() => void review("reject")}
      >
        Reject proposal
      </button>
      {message && <p role="status">{message}</p>}
    </article>
  );
}
