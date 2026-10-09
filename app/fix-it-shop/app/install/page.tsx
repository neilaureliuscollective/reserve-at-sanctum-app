import Image from "next/image";
import { isFixItApp } from "@/lib/app-edition";
import Link from "next/link";
import { FixItInstall } from "@/components/fix-it-install";
import { fixItBooking as brand } from "@/lib/fix-it-booking";
export const metadata = { title: "On your phone" };
export default function Page() {
  return (
    <main id="main" className="fix-it-content fix-it-install">
      <Image
        src="/fix-it-shop/app/brand-icons/192?v=steel-symbol-1"
        unoptimized
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
        suggested name is Fix It Shop and the icon matches the symbol above.
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
        {isFixItApp() ? <>
          <h2>Your independent app</h2>
          <p>Install from this Fix It Shop address. Sign in with your existing account; this app has its own browser session. Katie’s assigned staff account opens her working day. Booking and private records require an internet connection.</p>
        </> : <>
          <h2>If Legacy Reserve is already installed</h2>
          <p>Your browser may open the existing app. Use the browser menu and confirm the Fix It Shop name and icon. A separate installation is not guaranteed on this shared address.</p>
          <h2>Your account</h2>
          <p>An installed app may need a fresh sign-in. Signing out on this shared address also ends the Reserve session in this browser. Booking and appointments require an internet connection.</p>
        </>}
      </section>
      <Link className="button button-gold" href={brand.base}>
        Open Fix It Shop
      </Link>
    </main>
  );
}
