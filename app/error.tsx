"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="inner-page section center-state">
      <h1>
        A brief <em>pause.</em>
      </h1>
      <p>
        We couldn’t load this experience. Your existing appointments have not
        been changed.
      </p>
      <button className="button button-gold" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
