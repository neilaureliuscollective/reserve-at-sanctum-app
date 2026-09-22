"use client";

import { useState } from "react";
import { Apple, ArrowRight } from "lucide-react";
import { browserSupabase } from "@/lib/supabase-browser";

export function SocialAuthButtons({
  next,
  preview = false,
}: {
  next: string;
  preview?: boolean;
}) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function social(provider: "google" | "apple") {
    setBusy(provider);
    setError("");
    const client = browserSupabase();
    if (!client) {
      setError("Social sign-in opens when the hosted account service is connected.");
      setBusy("");
      return;
    }
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", next);
    const { error: authError } = await client.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callback.toString() },
    });
    if (authError) {
      setError("Unable to open that sign-in option. Please try again.");
      setBusy("");
    }
  }

  async function previewAccess() {
    setBusy("preview");
    setError("");
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preview", identity: "preview-client" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      window.location.assign(next);
    } catch (caught) {
      setError((caught as Error).message);
      setBusy("");
    }
  }

  return (
    <div className="social-auth-stack">
      <button className="social-auth-button google" disabled={Boolean(busy)} onClick={() => social("google")}>
        <span className="provider-g" aria-hidden="true">G</span>
        <span>{busy === "google" ? "Opening Google…" : "Continue with Google"}</span>
        <ArrowRight size={17} />
      </button>
      <button className="social-auth-button apple" disabled={Boolean(busy)} onClick={() => social("apple")}>
        <Apple size={20} aria-hidden="true" />
        <span>{busy === "apple" ? "Opening Apple…" : "Continue with Apple"}</span>
        <ArrowRight size={17} />
      </button>
      {preview && (
        <button className="preview-blueprint-button" disabled={Boolean(busy)} onClick={previewAccess}>
          {busy === "preview" ? "Saving preview…" : "Open My Sanctum preview"}
        </button>
      )}
      {error && <p className="auth-inline-error" role="alert">{error}</p>}
    </div>
  );
}
