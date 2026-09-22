"use client";
import { useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { SocialAuthButtons } from "@/components/social-auth-buttons";
export function SigninForm({
  preview,
  hosted,
  next,
  oauthError = false,
}: {
  preview: boolean;
  hosted: boolean;
  next: string;
  oauthError?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [signup, setSignup] = useState(false),
    [message, setMessage] = useState("");
  async function submit(body: unknown, destination = next) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (d.verify) {
        setMessage(
          "Check your email to confirm your account, then return here to sign in.",
        );
        setSignup(false);
        return;
      }
      window.location.assign(destination);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="signin-panel">
      {hosted ? (
        <>
          <SocialAuthButtons next={next} />
          <details className="email-fallback">
            <summary>Use email instead</summary>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              submit({
                action: signup ? "signup" : "signin",
                email: d.get("email"),
                password: d.get("password"),
                ...(signup ? { name: d.get("name") } : {}),
              });
            }}
          >
            {signup && (
              <label className="form-field">
                Your name
                <input
                  name="name"
                  autoComplete="name"
                  maxLength={100}
                  required
                />
              </label>
            )}
            <label className="form-field">
              Email
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label className="form-field">
              Password
              <input
                name="password"
                type="password"
                autoComplete={signup ? "new-password" : "current-password"}
                minLength={12}
                maxLength={128}
                required
              />
            </label>
            <button className="button button-gold full" disabled={busy}>
              {busy ? "One moment…" : signup ? "Create an account" : "Sign in"}{" "}
              <ArrowRight size={18} />
            </button>
          </form>
          <button className="text-link" onClick={() => setSignup(!signup)}>
            {signup ? "Already have an account? Sign in" : "Create an account"}
          </button>
          </details>
        </>
      ) : (
        !preview && (
          <p>
            Member accounts are being prepared. Sign-in will be available when
            the hosted platform is connected.
          </p>
        )
      )}
      {preview && !hosted && (
        <>
          <div className="preview-access-heading">
            <ShieldCheck size={20} />
            <span>LOCAL DEVELOPMENT ACCESS</span>
          </div>
          <p className="muted">
            Choose a test identity to explore the experience. These profiles
            contain synthetic data only.
          </p>
          {[
            {
              id: "preview-client",
              title: "Experience a client visit",
              desc: "Book, view, and manage your appointments",
            },
            {
              id: "preview-katie",
              title: "Open Katie’s studio",
              desc: "See the shared calendar and client details",
            },
            {
              id: "preview-neil",
              title: "Open Neil’s owner view",
              desc: "Review the entire preview experience",
            },
          ].map((x) => (
            <button
              key={x.id}
              disabled={busy}
              className="identity-button"
              onClick={() =>
                submit(
                  { action: "preview", identity: x.id },
                  next === "/account" && x.id !== "preview-client"
                    ? "/studio"
                    : next,
                )
              }
            >
              <span>
                <strong>{x.title}</strong>
                <small>{x.desc}</small>
              </span>
              <ArrowRight size={18} />
            </button>
          ))}
        </>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {oauthError && !error && (
        <p className="error-message" role="alert">That sign-in did not finish. Your work is still here—try Google or Apple again.</p>
      )}
      {message && (
        <p className="inline-note" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
