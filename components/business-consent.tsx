"use client";
import { useState } from "react";
export function BusinessConsent({
  authorizationId,
  providers,
  websites = false,
}: {
  websites?: boolean;
  authorizationId: string;
  providers: { id: string; name: string }[];
}) {
  const [websiteAccess, setWebsiteAccess] = useState(false);
  const [provider, setProvider] = useState(providers[0]?.id ?? ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function decide(decision: "approve" | "deny") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/business-connections/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorizationId,
          provider,
          decision,
          websiteAccess,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error ?? "Connection unavailable.");
      window.location.assign(data.redirect);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection unavailable.");
      setBusy(false);
    }
  }
  return (
    <section>
      <label>
        Professional
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          disabled={busy}
        >
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <p>
        Allow Public Aethelios to read this professional’s appointment times,
        services and status for 30 days. It cannot change bookings. Client
        contact details, Chair data and private notes stay in Reserve.
      </p>
      {websites && (
        <label>
          <input
            type="checkbox"
            checked={websiteAccess}
            disabled={busy}
            onChange={(e) => setWebsiteAccess(e.target.checked)}
          />{" "}
          Also allow reading website copy and saving proposals for my approved
          website. Publishing still requires separate approval in Reserve.
        </label>
      )}
      <p>
        Schedule questions use Public Aethelios. Your personal Aethelios history
        stays separate. You can revoke access in Studio.
      </p>
      <button
        className="button button-gold"
        disabled={busy || !provider}
        onClick={() => decide("approve")}
      >
        Connect my business
      </button>{" "}
      <button disabled={busy} onClick={() => decide("deny")}>
        Decline
      </button>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
export function RevokeBusiness({ id }: { id: string }) {
  const [message, setMessage] = useState("");
  return (
    <>
      <button
        onClick={async () => {
          const r = await fetch("/api/business-connections/consent", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          });
          setMessage(
            r.ok
              ? "Revoked. Refresh to see current connections."
              : "Could not confirm revocation.",
          );
        }}
      >
        Revoke access
      </button>
      <p role="status">{message}</p>
    </>
  );
}
