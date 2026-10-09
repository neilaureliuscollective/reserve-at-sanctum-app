import Image from "next/image";
import Link from "next/link";
import { configured, database, isPreview } from "@/lib/db";
import { memberRead } from "@/lib/experience/member";
import { sanctumDirectory } from "@/lib/experience/sanctum-directory";
import { katieVisitPresentation } from "@/lib/experience/katie-world";
import { fixItBooking as brand } from "@/lib/fix-it-booking";
export const dynamic = "force-dynamic";
export default async function Page() {
  const directory = configured()
    ? await memberRead(async () => sanctumDirectory(await database()), 2500)
    : { state: "ready" as const, data: [] };
  const visit = katieVisitPresentation(
    directory.data ?? [],
    directory.state === "unavailable",
  );
  const money = (cents: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  return (
    <main id="main" className="fix-it-content">
      {isPreview() && (
        <p role="note">
          Development preview · services, prices and accounts are illustrative.
        </p>
      )}
      <section className="fix-it-arrival">
        <div>
          <p className="eyebrow">KATIE GUIDRY · FOUNDER OF FIX IT SHOP</p>
          <h1>
            Your next visit.
            <br />
            <em>With Katie.</em>
          </h1>
          <p>Personal attention. Professional care. A visit made for you.</p>
          <div className="hero-actions">
            <Link className="button button-gold" href={brand.book}>
              {visit.state === "open"
                ? "Book with Katie"
                : "View booking status"}{" "}
              ↗
            </Link>
            <Link className="text-link" href={brand.visits}>
              Manage my visits ↗
            </Link>
          </div>
        </div>
        <Image
          src="/images/approved/fix-it-shop.webp"
          alt="Fix It Shop’s blue and gold crest"
          width={440}
          height={440}
          sizes="(max-width:600px) 60vw, 35vw"
          priority
        />
      </section>
      <section className="fix-it-menu" aria-labelledby="menu-title">
        <p className="eyebrow">YOUR TIME, WELL PLACED</p>
        <h2 id="menu-title">Services with Katie.</h2>
        <p role="status">{visit.status}</p>
        {visit.locations.map((location) => (
          <div key={location.id}>
            <h3>
              {location.city}, {location.region}
            </h3>
            <p>
              {location.address || "Location details are being prepared."} ·{" "}
              {location.timezone}
            </p>
            {location.services.map((service) => (
              <Link
                className="fix-it-service"
                key={service.id}
                href={
                  brand.book +
                  "?" +
                  new URLSearchParams({
                    location: location.id,
                    service: service.id,
                  })
                }
              >
                <div>
                  <h3>{service.name}</h3>
                  <p>{service.description}</p>
                  <span>{service.minutes} minutes</span>
                </div>
                <strong>
                  {money(service.price)}
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
          Your confirmed appointments stay together. Sign in to reschedule,
          cancel or book your next visit.
        </p>
        <Link className="button button-outline" href={brand.visits}>
          Open my appointments
        </Link>
        <Link className="text-link" href={brand.base + "/install"}>
          Add Fix It Shop to your home screen ↗
        </Link>
      </section>
    </main>
  );
}
