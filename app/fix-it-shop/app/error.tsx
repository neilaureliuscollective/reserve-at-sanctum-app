"use client";
import Link from "next/link";
export default function ErrorScreen({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="fix-it-content">
      <section className="fix-it-return" role="alert">
        <p className="eyebrow">FIX IT SHOP</p>
        <h1>Let’s try that again.</h1>
        <p>
          This screen couldn’t load. If you were confirming a visit, check My
          visits before booking again.
        </p>
        <div className="hero-actions">
          <button className="button button-gold" onClick={reset}>
            Try again
          </button>
          <Link
            className="button button-outline"
            href="/fix-it-shop/app/appointments"
          >
            My visits
          </Link>
        </div>
      </section>
    </main>
  );
}
