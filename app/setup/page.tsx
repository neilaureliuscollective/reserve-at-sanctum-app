import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { isPreview } from "@/lib/db";
export const dynamic = "force-dynamic";
export const metadata = { title: "Set up your Reserve" };
export default async function Page() {
  const actor = await currentUser();
  const studio =
    actor &&
    (actor.role === "owner" ||
      (actor.role === "staff" && actor.provider_id === "katie"));
  return (
    <main id="main" className="inner-page section setup-page">
      <p className="eyebrow">YOUR RESERVE · ON YOUR PHONE</p>
      <h1>
        A place on your <em>home screen.</em>
      </h1>
      <p>
        Open the Reserve’s HTTPS link directly in your phone’s browser. Keep an
        internet connection for visits and client information.
      </p>
      <section>
        <h2>1. Sign in to your Reserve</h2>
        {actor ? (
          <>
            <p>
              Signed in as {actor.name}.{" "}
              {studio
                ? "Your studio access is ready."
                : "This account has client access."}
            </p>
            {!studio && (
              <p>
                For Katie’s studio access, Neil needs to have your verified
                account assigned to Katie’s provider. Signing up does not grant
                staff access.
              </p>
            )}
          </>
        ) : (
          <Link className="button button-gold" href="/signin?next=/setup">
            Sign in to the Reserve
          </Link>
        )}
        {isPreview() && (
          <p>
            This is a local demonstration with synthetic accounts. It does not
            confirm that a real phone account is ready.
          </p>
        )}
      </section>
      <section>
        <h2>2. Add it to your home screen</h2>
        <h3>Samsung / Android</h3>
        <p>
          In Chrome, open the browser menu and choose “Add to Home screen” or
          “Install app.” In Samsung Internet, look for “Add page to” → “Home
          screen.” The wording can vary by browser.
        </p>
        <h3>iPhone</h3>
        <p>
          In Safari, open Share, choose “Add to Home Screen,” then Add. Launch
          the new icon and sign in there if asked; the installed app may use a
          separate sign-in session.
        </p>
        <p>
          If you opened the link inside a messaging app, first open it in your
          regular browser.
        </p>
      </section>
      <section>
        <h2>3. Try a complete visit</h2>
        <p>
          For the private pilot, use test details. Book a visit from a client
          account, find it in Katie’s studio, reschedule it, and cancel it. Then
          block a break and confirm that time disappears from booking.
        </p>
        <p>
          Appointment reminders, payment collection, and calendar sync are not
          connected. Check the saved visit in the app.
        </p>
        <div className="setup-actions">
          <Link
            className="button button-gold"
            href={studio ? "/studio" : "/account"}
          >
            {studio ? "Open your studio" : "Your visits"}
          </Link>
          <Link className="button" href="/book">
            Try booking
          </Link>
        </div>
      </section>
    </main>
  );
}
