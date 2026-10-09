import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { publishedBrand } from "@/lib/provider-brand-page";
import { brandIdentity } from "@/lib/provider-brands";
import { identityDestination } from "@/lib/booking-identity";
import { database, isPreview, configured } from "@/lib/db";
import { currentUser, hasSupabase } from "@/lib/auth";
import { sanctumDirectory } from "@/lib/experience/sanctum-directory";
import {
  ProviderHome,
  ProviderInstall,
} from "@/components/provider-booking-world";
import { BookingFlow } from "@/components/booking-flow";
import { Visits } from "@/components/visits";
import { SigninForm } from "@/components/signin-form";
import { PasswordRecovery } from "@/components/password-recovery";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; view?: string[] }>;
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const route = await params,
    row = await publishedBrand(route.slug),
    p = row.profile,
    b = brandIdentity(row, p);
  if (!route.view?.length) redirect(b.base);
  if (route.view[0] !== "app") notFound();
  const view = route.view.slice(1).join("/") || "home";
  if (view === "home")
    return (
      <ProviderHome
        profile={p}
        identity={b}
        directory={await sanctumDirectory(await database())}
        development={isPreview()}
      />
    );
  if (view === "install") return <ProviderInstall profile={p} identity={b} />;
  if (view === "book")
    return (
      <main id="main" className="fix-it-content">
        <BookingFlow preview={isPreview()} identity={b} />
      </main>
    );
  if (view === "appointments") {
    const a = await currentUser();
    if (!a) redirect(b.signin + "?next=" + encodeURIComponent(b.visits));
    return (
      <main id="main" className="fix-it-content">
        <Visits actor={a} preview={isPreview()} identity={b} />
      </main>
    );
  }
  if (view === "signin") {
    const q = await searchParams,
      next = identityDestination(b, q.next),
      origin = process.env.APP_ORIGIN;
    if (
      process.env.VERCEL_ENV === "production" &&
      origin &&
      (await headers()).get("host") !== new URL(origin).host
    ) {
      const u = new URL(b.signin, origin);
      u.searchParams.set("next", next);
      if (q.error === "oauth") u.searchParams.set("error", "oauth");
      redirect(u.toString());
    }
    return (
      <main id="main" className="fix-it-content fix-it-auth">
        <p className="eyebrow">{p.name} · YOUR APPOINTMENTS</p>
        <h1>
          Welcome <em>back.</em>
        </h1>
        <p>
          Use your existing Legacy Reserve account. Your appointments with{" "}
          {p.professional} stay here.
        </p>
        <SigninForm
          preview={isPreview()}
          hosted={hasSupabase() && configured()}
          next={next}
          oauthError={q.error === "oauth"}
          clientOnly
          recoveryHref={b.base + "/forgot-password"}
        />
      </main>
    );
  }
  if (view === "forgot-password" || view === "reset-password")
    return (
      <main id="main" className="fix-it-content fix-it-auth">
        <h1>
          {view === "reset-password"
            ? "Choose a password."
            : "Find your way back."}
        </h1>
        <PasswordRecovery
          reset={view === "reset-password"}
          recoveryReturn={b.base + "/reset-password"}
          accountHref={b.signin}
        />
      </main>
    );
  notFound();
}
