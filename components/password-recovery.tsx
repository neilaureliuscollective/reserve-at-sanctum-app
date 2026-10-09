"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
export function PasswordRecovery({
  reset = false,
  recoveryReturn,
  accountHref,
}: {
  reset?: boolean;
  recoveryReturn?: string;
  accountHref?: string;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          reset
            ? { action: "update-password", password: f.get("password") }
            : {
                action: "recover",
                email: f.get("email"),
                next: recoveryReturn,
              },
        ),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setMessage(
        reset
          ? "Password updated. You can return to your account."
          : "If that email has an account, follow the recovery link in your inbox. Open it in this browser.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="signin-panel" onSubmit={submit}>
      <label className="form-field">
        {reset ? "New password" : "Email"}
        <input
          name={reset ? "password" : "email"}
          type={reset ? "password" : "email"}
          autoComplete={reset ? "new-password" : "email"}
          minLength={reset ? 12 : undefined}
          maxLength={reset ? 128 : 254}
          required
        />
      </label>
      <button className="button button-gold" disabled={busy}>
        {busy
          ? "One moment…"
          : reset
            ? "Update password"
            : "Request recovery link"}
      </button>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <Link
        className="text-link"
        href={accountHref || (reset ? "/enter" : "/signin")}
      >
        {reset ? "Open your account" : "Back to sign in"}
      </Link>
    </form>
  );
}
