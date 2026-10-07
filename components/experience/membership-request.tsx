"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MemberRequest } from "@/lib/membership-operations";
export function MembershipRequest({
  request,
}: {
  request: MemberRequest | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const interest = new FormData(event.currentTarget).get("interest");
    try {
      const r = await fetch("/api/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interest }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setMessage(
        "Your request is saved. No payment or enrollment has been made.",
      );
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function withdraw() {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/membership", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: request?.id, revision: request?.revision }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setMessage("Your request has been withdrawn.");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="member-line membership-request">
      <div>
        <p className="experience-kicker">MEMBERSHIP ACCESS</p>
        <h2>
          {request?.status === "submitted"
            ? "Your request is with the house."
            : request?.status === "closed"
              ? "Your request has been reviewed."
              : request?.status === "fulfilled"
                ? "Your access is on record."
                : "Begin the relationship."}
        </h2>
        <p>
          {request?.status === "submitted"
            ? "You can withdraw this request at any time. It does not enroll you or authorize a charge."
            : request?.status === "closed"
              ? "No membership has been activated from this request."
              : request?.status === "fulfilled"
                ? "Your membership status above reflects current access."
                : "Let the house know what brings you to Legacy Reserve. Requesting access does not enroll you or authorize payment."}
        </p>
        {(!request || request.status === "withdrawn") && (
          <form onSubmit={submit} className="member-location-form">
            <label htmlFor="membership-interest">
              What interests you most?
            </label>
            <select id="membership-interest" name="interest">
              <option value="membership">The full membership</option>
              <option value="services">Services and appointments</option>
              <option value="products">Legacy Reserve products</option>
            </select>
            <button className="button button-gold" disabled={busy}>
              {busy ? "Saving…" : "Request membership access"}
            </button>
          </form>
        )}
        {request?.status === "submitted" && (
          <button
            className="button button-outline"
            onClick={withdraw}
            disabled={busy}
          >
            Withdraw request
          </button>
        )}
        <p role="status" className="member-note">
          {message}
        </p>
      </div>
    </section>
  );
}
