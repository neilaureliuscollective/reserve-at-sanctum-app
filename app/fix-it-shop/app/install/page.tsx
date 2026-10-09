import Image from "next/image";
import Link from "next/link";
import { FixItInstall } from "@/components/fix-it-install";
import { fixItBooking as brand } from "@/lib/fix-it-booking";
export const metadata = { title: "On your phone" };
export default function Page() {
  return (
    <main id="main" className="fix-it-content fix-it-install">
      <Image
        src="/fix-it-shop/app/brand-icons/192?v=steel-symbol-1"
        width={96}
        height={96}
        alt="Fix It Shop home-screen icon"
      />
      <p className="eyebrow">FIX IT SHOP · ON YOUR PHONE</p>
      <h1>
        Your next visit.
        <br />
        <em>One tap away.</em>
      </h1>
      <p>
        Open this link directly in your phone’s browser. Check that the
        suggested name is Fix It Shop and the icon matches the crest above.
      </p>
      <FixItInstall />
      <section>
        <h2>iPhone or iPad</h2>
        <p>
          In Safari, open Share, then Add to Home Screen. Choose Open as Web App
          if that option appears, check the name, and tap Add.
        </p>
        <h2>Android</h2>
        <p>
          In Chrome or Samsung Internet, open the browser menu and choose
          Install app or Add to home screen. The wording and available options
          vary.
        </p>
        <h2>If Legacy Reserve is already installed</h2>
        <p>
          Your browser may show no separate install prompt or may open the
          existing app. Use the manual browser-menu option and confirm the Fix
          It Shop name and icon. A separate installation is not guaranteed on
          every browser.
        </p>
        <h2>Your account</h2>
        <p>
          The website uses the same Legacy Reserve account. An installed app may
          need a fresh sign-in. Signing out in this browser also signs you out
          of the shared Reserve session. Booking and appointments require an
          internet connection.
        </p>
      </section>
      <Link className="button button-gold" href={brand.base}>
        Open Fix It Shop
      </Link>
    </main>
  );
}
