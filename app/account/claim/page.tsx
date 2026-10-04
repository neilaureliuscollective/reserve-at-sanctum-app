"use client";
import { useState } from "react";
import Link from "next/link";
export default function Claim() {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function accept() {
    setBusy(true);
    try {
      const token = location.hash.slice(1);
      const r = await fetch("/api/customers/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim", token }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      history.replaceState(null, "", location.pathname);
      setMessage("Your visit history is linked to this account.");
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Unable to accept invitation.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main" className="inner-page section">
      <h1>Your Reserve history</h1>
      <p>
        Sign in with the verified email the location used for your guest
        profile, then accept your private invitation.
      </p>
      <button className="button button-gold" disabled={busy} onClick={accept}>
        Accept invitation
      </button>
      <p role="status">{message}</p>
      <Link href="/signin?next=/account/claim">Sign in</Link> ·{" "}
      <Link href="/account">Your visits</Link>
    </main>
  );
}
