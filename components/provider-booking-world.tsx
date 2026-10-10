import Link from "next/link";
import { FixItCustomerNav } from "@/components/fix-it-customer";
import type { CSSProperties, ReactNode } from "react";
import type { BookingIdentity } from "@/lib/booking-identity";
import { brandAsset, logoFor, type BrandProfile } from "@/lib/provider-brands";
import { FixItInstallCapture, FixItInstall } from "@/components/fix-it-install";
import type { SanctumDestination } from "@/lib/experience/sanctum-directory";
export function brandStyle(p: BrandProfile): CSSProperties {
  return {
    "--brand-theme": p.theme,
    "--brand-accent": p.accent,
  } as CSSProperties;
}
export function ProviderWorld({
  profile: p,
  identity: b,
  children,
  preview = false,
}: {
  profile: BrandProfile;
  identity: BookingIdentity;
  children: ReactNode;
  preview?: boolean;
}) {
  const logo = logoFor(p, b.providerId, 192, preview);
  return (
    <FixItInstallCapture>
      <div
        className={`fix-it-app provider-app${b.providerId === "katie" ? " fix-it-premium" : ""}`}
        style={brandStyle(p)}
      >
        <a className="skip" href="#main">
          Skip to content
        </a>
        <header className="fix-it-masthead">
          <Link href={b.base}>
            {logo && <img src={logo} width={52} height={52} alt="" />}
            <span>
              {p.name}
              <small>
                {p.professional} · {p.title}
              </small>
            </span>
          </Link>
          <Link className="text-link" href={b.visits}>
            My visits ↗
          </Link>
        </header>
        {children}
        <footer className="fix-it-footer">
          <span>
            {p.name} · {p.professional}
          </span>
          {b.providerId === "katie" && (
            <><Link href="/fix-it-shop">Meet Katie</Link><Link href="/chair">The Chair</Link><Link href="/account">Full appointment history</Link></>
          )}
          <Link href="/privacy">Privacy</Link>
          <Link href="/booking-technology">Powered by Aethelios Booking ↗</Link>
        </footer>
        {!preview && b.providerId === "katie" && <FixItCustomerNav />}
        {!preview && b.providerId !== "katie" && (
          <nav className="fix-it-nav" aria-label={p.name}>
            <Link href={b.base}>Home</Link>
            <Link href={b.book}>Book</Link>
            <Link href={b.visits}>My visits</Link>
            <Link href={b.base + "/install"}>Phone setup</Link>
          </nav>
        )}
      </div>
    </FixItInstallCapture>
  );
}
export function ProviderHome({
  profile: p,
  identity: b,
  directory,
  preview = false,
  development = false,
}: {
  profile: BrandProfile;
  identity: BookingIdentity;
  directory: SanctumDestination[];
  preview?: boolean;
  development?: boolean;
}) {
  const places = directory
    .filter((l) => l.enabled && l.booking_enabled)
    .flatMap((l) => {
      const person = l.professionals.find((v) => v.id === b.providerId);
      return person?.services.length
        ? [{ ...l, services: person.services }]
        : [];
    });
  const image = p.cover
    ? brandAsset(p.cover, "image", preview)
    : logoFor(p, b.providerId, 512, preview);
  const money = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(n / 100);
  return (
    <main id="main" className="fix-it-content">
      {development && (
        <p role="note">
          Development preview · services, prices and accounts are illustrative.
        </p>
      )}
      {preview && (
        <p role="note">
          Private draft preview · changes are not published. Booking links use
          the public experience.
        </p>
      )}
      <section className="fix-it-arrival">
        <div>
          <p className="eyebrow">
            {p.professional} · {p.title}
          </p>
          <h1>{p.headline}</h1>
          <p className="provider-bio">{p.bio}</p>
          <div className="hero-actions">
            <Link className="button button-gold" href={b.book}>
              {places.length ? "Book a visit" : "View booking status"} ↗
            </Link>
            <Link href={b.visits}>Manage my visits ↗</Link>
          </div>
        </div>
        {image && (
          <img
            className={p.cover ? "provider-cover" : undefined}
            src={image}
            width={440}
            height={440}
            alt={p.cover ? `${p.name} studio` : `${p.name} logo`}
          />
        )}
      </section>
      <section className="fix-it-menu" aria-labelledby="provider-services">
        <p className="eyebrow">YOUR TIME, WELL PLACED</p>
        <h2 id="provider-services">Services with {p.professional}.</h2>
        <p role="status">
          {places.length
            ? "Choose a published service to find an available time."
            : "Booking is in preparation. Approved services and times will appear here when available."}
        </p>
        {places.map((l) => (
          <div key={l.id}>
            <h3>
              {l.city}, {l.region}
            </h3>
            <p>
              {l.address || "Location details are being prepared."} ·{" "}
              {l.timezone}
            </p>
            {l.services.map((s) => (
              <Link
                className="fix-it-service"
                key={s.id}
                href={
                  b.book +
                  "?" +
                  new URLSearchParams({ location: l.id, service: s.id })
                }
              >
                <div>
                  <h3>{s.name}</h3>
                  <p>{s.description}</p>
                  <span>{s.minutes} minutes</span>
                </div>
                <strong>
                  {money(s.price)}
                  <small>Find a time ↗</small>
                </strong>
              </Link>
            ))}
          </div>
        ))}
      </section>
      <section className="fix-it-return">
        <h2>A simple return.</h2>
        <p>
          Sign in with your existing account to manage these
          visits or book again.
        </p>
        <Link className="button button-outline" href={b.visits}>
          My appointments
        </Link>
      </section>
    </main>
  );
}
export function ProviderInstall({
  profile: p,
  identity: b,
}: {
  profile: BrandProfile;
  identity: BookingIdentity;
}) {
  return (
    <main id="main" className="fix-it-content fix-it-install">
      <p className="eyebrow">{p.name} · ON YOUR PHONE</p>
      <h1>
        Your next visit.
        <br />
        <em>One tap away.</em>
      </h1>
      <p>
        Open this link directly in your phone’s browser. Confirm the name is{" "}
        {p.name} and the icon is your provider’s logo.
      </p>
      <FixItInstall name={p.name} />
      <section>
        <h2>iPhone or iPad</h2>
        <p>
          In Safari, choose Share → Add to Home Screen. Choose Open as Web App
          if offered, then check the name and icon.
        </p>
        <h2>Android</h2>
        <p>
          In Chrome or Samsung Internet, use Install app or Add to home screen
          from the browser menu, if available.
        </p>
        <h2>If another Reserve app is installed</h2>
        <p>
          Your browser may reuse that app or suppress this install prompt.
          Manual home-screen setup may help; independent installation is not
          guaranteed.
        </p>
        <h2>Your account</h2>
        <p>
          Use your existing account. An installed app may need a
          fresh sign-in. Signing out in this browser also signs out the shared
          Reserve session. Booking and appointments require an internet
          connection.
        </p>
      </section>
      <Link href={b.base}>Return to {p.name} ↗</Link>
    </main>
  );
}
