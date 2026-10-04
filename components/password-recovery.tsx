"use client";
import { useState } from "react";
import Link from "next/link";
export function PasswordRecovery({ reset = false }: { reset?: boolean }) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main id="main" className="inner-page section">
      <h1>{reset ? "Set your password" : "Recover your account"}</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage("");
          const f = new FormData(e.currentTarget);
          try {
            const response = await fetch("/api/auth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(
                reset
                  ? { action: "password", password: f.get("password") }
                  : { action: "recover", email: f.get("email") },
              ),
            });
            const d = await response.json();
            if (!response.ok) throw Error(d.error);
            setMessage(
              reset
                ? "Password updated."
                : "If an account matches, a recovery email will arrive shortly.",
            );
          } catch (e) {
            setMessage(
              e instanceof Error
                ? e.message
                : "Unable to complete this request.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          {reset ? "New password" : "Email"}
          <input
            name={reset ? "password" : "email"}
            type={reset ? "password" : "email"}
            minLength={reset ? 12 : undefined}
            maxLength={reset ? 128 : 254}
            required
            autoComplete={reset ? "new-password" : "email"}
          />
        </label>
        <button className="button button-gold" disabled={busy}>
          {reset ? "Update password" : "Send recovery link"}
        </button>
      </form>
      <p role="status">{message}</p>
      <Link href="/signin">Back to sign in</Link>
    </main>
  );
}
