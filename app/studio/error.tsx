"use client";
export default function StudioError({ reset }: { reset: () => void }) {
  return (
    <section className="studio-section">
      <p className="eyebrow">STUDIO CONNECTION</p>
      <h1>Your work is still yours.</h1>
      <p>
        We couldn’t load this room. Reconnect and try again; unavailable records
        are never shown as empty business results.
      </p>
      <button className="button button-gold" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
