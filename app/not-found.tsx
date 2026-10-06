import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="inner-page section center-state">
      <p className="eyebrow">A DIFFERENT PATH</p>
      <h1>
        Let’s find <em>your way.</em>
      </h1>
      <p>This page is not part of Legacy Reserve.</p>
      <Link className="button button-gold" href="/">
        Return to Legacy Reserve
      </Link>
    </main>
  );
}
